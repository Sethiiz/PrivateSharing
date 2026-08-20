window.TDG = window.TDG || {};

TDG.webrtc = (() => {
  function iceServers() {
    const servers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turn = TDG.settings.getTurn();
    if (turn.enabled && turn.host) {
      servers.push({ urls: turn.host, username: turn.user || undefined, credential: turn.pass || undefined });
    }
    return servers;
  }

  let localStream = null;
  let sharing = false;
  let watcherCount = 0;

  const broadcastConnections = new Map(); // watcherId -> RTCPeerConnection
  const watchConnections = new Map(); // broadcasterId -> { pc, retries, retryTimer, closed }
  const prevBytes = new Map(); // peerId -> bytes (pra calcular kbps)

  const listeners = new Map();
  function on(type, cb) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(cb);
  }
  function emit(type, payload) {
    for (const cb of listeners.get(type) || []) cb(payload);
  }

  const send = (obj) => TDG.signaling.send(obj);

  // ---------- compartilhar ----------

  function videoConstraints() {
    switch (TDG.settings.getShareQuality()) {
      case 'light':
        return { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 30, max: 30 } };
      case 'max':
        return { frameRate: { ideal: 60, max: 60 } };
      default:
        return { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } };
    }
  }

  async function captureDisplay({ withAudio = true } = {}) {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: videoConstraints(), audio: false });
    if (withAudio) {
      const audioTrack = await TDG.audioMixer.start();
      if (audioTrack) stream.addTrack(audioTrack);
    }
    return stream;
  }

  async function startSharing() {
    localStream = await captureDisplay();
    sharing = true;
    send({ type: 'start-share' });
    localStream.getVideoTracks()[0].onended = stopSharing;
    startStatsLoop();
    emit('sharing-started', { stream: localStream });
    return localStream;
  }

  async function switchScreen() {
    if (!sharing) return;
    const newStream = await captureDisplay({ withAudio: false });
    const newVideoTrack = newStream.getVideoTracks()[0];

    for (const pc of broadcastConnections.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(newVideoTrack);
    }

    const oldVideoTrack = localStream.getVideoTracks()[0];
    oldVideoTrack.stop();
    localStream.removeTrack(oldVideoTrack);
    localStream.addTrack(newVideoTrack);
    newVideoTrack.onended = stopSharing;

    newStream.getAudioTracks().forEach((t) => t.stop());
    emit('sharing-started', { stream: localStream });
  }

  function stopSharing() {
    sharing = false;
    send({ type: 'stop-share' });
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    TDG.audioMixer.stop();
    for (const pc of broadcastConnections.values()) pc.close();
    broadcastConnections.clear();
    watcherCount = 0;
    stopStatsLoopIfIdle();
    emit('sharing-stopped');
  }

  function updateWatcherCount(delta) {
    watcherCount = Math.max(0, watcherCount + delta);
    emit('watcher-count', { count: watcherCount });
  }

  function closeBroadcastConnection(watcherId) {
    const existing = broadcastConnections.get(watcherId);
    if (!existing) return;
    existing.close();
    broadcastConnections.delete(watcherId);
    updateWatcherCount(-1);
    stopStatsLoopIfIdle();
  }

  async function createOfferFor(watcherId) {
    closeBroadcastConnection(watcherId);

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    broadcastConnections.set(watcherId, pc);
    updateWatcherCount(1);
    startStatsLoop();

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'signal', to: watcherId, data: { candidate: e.candidate } });
    };
    pc.onconnectionstatechange = () => {
      if (['closed', 'failed', 'disconnected'].includes(pc.connectionState)) {
        if (broadcastConnections.get(watcherId) === pc) {
          broadcastConnections.delete(watcherId);
          updateWatcherCount(-1);
          stopStatsLoopIfIdle();
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'signal', to: watcherId, data: { sdp: offer } });
  }

  async function restartOfferFor(watcherId) {
    const pc = broadcastConnections.get(watcherId);
    if (!pc) return createOfferFor(watcherId);
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    send({ type: 'signal', to: watcherId, data: { sdp: offer } });
  }

  // ---------- assistir ----------

  function watchAll(broadcasterIds) {
    const wanted = new Set(broadcasterIds);
    for (const id of [...watchConnections.keys()]) {
      if (!wanted.has(id)) stopWatching(id);
    }
    for (const id of wanted) {
      if (!watchConnections.has(id)) startWatching(id);
    }
  }

  function startWatching(broadcasterId) {
    const entry = { pc: null, retries: 0, retryTimer: null, closed: false };
    watchConnections.set(broadcasterId, entry);
    openWatchConnection(broadcasterId, false);
    startStatsLoop();
  }

  function openWatchConnection(broadcasterId, iceRestart) {
    const entry = watchConnections.get(broadcasterId);
    if (!entry || entry.closed) return;

    if (!entry.pc) {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      entry.pc = pc;

      pc.ontrack = (e) => {
        emit('watch-track', { broadcasterId, stream: e.streams[0] });
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'signal', to: broadcasterId, data: { candidate: e.candidate } });
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'failed' || state === 'disconnected') {
          handleWatchTrouble(broadcasterId);
        } else if (state === 'connected' || state === 'completed') {
          if (entry.retries > 0) {
            entry.retries = 0;
            emit('watch-recovered', { broadcasterId });
          }
        }
      };
    }

    send({ type: 'signal', to: broadcasterId, data: { requestOffer: true, iceRestart } });
  }

  function handleWatchTrouble(broadcasterId) {
    const entry = watchConnections.get(broadcasterId);
    if (!entry || entry.closed || entry.retryTimer) return;

    entry.retries += 1;
    if (entry.retries > 5) {
      emit('watch-gave-up', { broadcasterId });
      return;
    }
    emit('watch-reconnecting', { broadcasterId, attempt: entry.retries });

    const delay = Math.min(1000 * 2 ** (entry.retries - 1), 8000);
    entry.retryTimer = setTimeout(() => {
      entry.retryTimer = null;
      openWatchConnection(broadcasterId, true);
    }, delay);
  }

  function retryNow(broadcasterId) {
    const entry = watchConnections.get(broadcasterId);
    if (!entry) return;
    if (entry.retryTimer) {
      clearTimeout(entry.retryTimer);
      entry.retryTimer = null;
    }
    entry.retries += 1;
    emit('watch-reconnecting', { broadcasterId, attempt: entry.retries });
    openWatchConnection(broadcasterId, true);
  }

  function stopWatching(broadcasterId) {
    const entry = watchConnections.get(broadcasterId);
    if (!entry) return;
    entry.closed = true;
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    if (entry.pc) entry.pc.close();
    watchConnections.delete(broadcasterId);
    prevBytes.delete(broadcasterId);
    stopStatsLoopIfIdle();
    send({ type: 'signal', to: broadcasterId, data: { stopWatching: true } });
    emit('watch-stopped', { broadcasterId });
  }

  function stopAllWatching() {
    for (const id of [...watchConnections.keys()]) stopWatching(id);
  }

  // ---------- sinalização ----------

  async function handleSignal(fromId, data) {
    if (data.stopWatching) {
      closeBroadcastConnection(fromId);
      return;
    }

    if (data.requestOffer) {
      if (!sharing) return;
      if (data.iceRestart) await restartOfferFor(fromId);
      else await createOfferFor(fromId);
      return;
    }

    if (data.sdp) {
      if (data.sdp.type === 'offer') {
        const entry = watchConnections.get(fromId);
        const pc = entry && entry.pc;
        if (!pc) return;
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'signal', to: fromId, data: { sdp: answer } });
      } else if (data.sdp.type === 'answer') {
        const pc = broadcastConnections.get(fromId);
        if (pc) await pc.setRemoteDescription(data.sdp);
      }
      return;
    }

    if (data.candidate) {
      const pc = broadcastConnections.get(fromId) || (watchConnections.get(fromId) || {}).pc;
      if (pc) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {
          console.warn('Erro ao adicionar ICE candidate:', e);
        }
      }
    }
  }

  // ---------- estatísticas ----------

  let statsTimer = null;
  function startStatsLoop() {
    if (statsTimer) return;
    statsTimer = setInterval(pollStats, 2000);
  }
  function stopStatsLoopIfIdle() {
    if (broadcastConnections.size === 0 && watchConnections.size === 0 && statsTimer) {
      clearInterval(statsTimer);
      statsTimer = null;
    }
  }

  async function statsFor(peerId, pc) {
    if (!pc || pc.connectionState === 'closed') return null;
    let report;
    try {
      report = await pc.getStats();
    } catch {
      return null;
    }

    let route = null;
    let rttMs = null;
    let lossPct = null;
    let fps = null;
    let bytes = null;
    let selectedPairId = null;

    report.forEach((s) => {
      if (s.type === 'transport' && s.selectedCandidatePairId) selectedPairId = s.selectedCandidatePairId;
    });
    report.forEach((s) => {
      const isSelectedPair = s.type === 'candidate-pair' && (s.id === selectedPairId || s.selected);
      if (isSelectedPair) {
        if (typeof s.currentRoundTripTime === 'number') rttMs = Math.round(s.currentRoundTripTime * 1000);
        const localCand = report.get(s.localCandidateId);
        if (localCand) route = localCand.candidateType === 'relay' ? 'turn' : 'p2p';
      }
      if (s.type === 'outbound-rtp' && s.kind === 'video') {
        fps = typeof s.framesPerSecond === 'number' ? s.framesPerSecond : fps;
        bytes = s.bytesSent;
      }
      if (s.type === 'inbound-rtp' && s.kind === 'video') {
        fps = typeof s.framesPerSecond === 'number' ? s.framesPerSecond : fps;
        bytes = s.bytesReceived;
        if (typeof s.packetsLost === 'number' && typeof s.packetsReceived === 'number') {
          const total = s.packetsLost + s.packetsReceived;
          lossPct = total > 0 ? Math.round((s.packetsLost / total) * 1000) / 10 : 0;
        }
      }
    });

    let kbps = null;
    if (typeof bytes === 'number') {
      const prev = prevBytes.get(peerId);
      prevBytes.set(peerId, bytes);
      if (typeof prev === 'number' && bytes >= prev) kbps = Math.round(((bytes - prev) * 8) / 1000 / 2);
    }

    return { route, rttMs, lossPct, fps, kbps };
  }

  async function pollStats() {
    for (const [watcherId, pc] of broadcastConnections) {
      const s = await statsFor(watcherId, pc);
      if (s) emit('stats', { peerId: watcherId, role: 'broadcast', ...s });
    }
    for (const [broadcasterId, entry] of watchConnections) {
      const s = await statsFor(broadcasterId, entry.pc);
      if (s) emit('stats', { peerId: broadcasterId, role: 'watch', ...s });
    }
  }

  function reset() {
    stopSharing();
    stopAllWatching();
  }

  return {
    on,
    startSharing,
    switchScreen,
    stopSharing,
    watchAll,
    stopAllWatching,
    retryNow,
    handleSignal,
    reset,
    isSharing: () => sharing,
    getWatcherCount: () => watcherCount,
    getLocalStream: () => localStream,
  };
})();
