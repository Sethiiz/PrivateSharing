window.TDG = window.TDG || {};

TDG.webrtc = (() => {
  const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

  let localStream = null;
  let sharing = false;

  const broadcastConnections = new Map(); // watcherId -> RTCPeerConnection
  let watchConnection = null;
  let watchingId = null;

  const listeners = new Map();
  function on(type, cb) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(cb);
  }
  function emit(type, payload) {
    for (const cb of listeners.get(type) || []) cb(payload);
  }

  const send = (obj) => TDG.signaling.send(obj);

  async function startSharing() {
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    sharing = true;
    send({ type: 'start-share' });
    localStream.getVideoTracks()[0].onended = stopSharing;
    return localStream;
  }

  function stopSharing() {
    sharing = false;
    send({ type: 'stop-share' });
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    for (const pc of broadcastConnections.values()) pc.close();
    broadcastConnections.clear();
    emit('sharing-stopped');
  }

  async function createOfferFor(watcherId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    broadcastConnections.set(watcherId, pc);

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'signal', to: watcherId, data: { candidate: e.candidate } });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'signal', to: watcherId, data: { sdp: offer } });
  }

  function startWatching(broadcasterId) {
    stopWatching();
    watchingId = broadcasterId;
    emit('watch-connecting', { broadcasterId });

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    watchConnection = pc;

    pc.ontrack = (e) => {
      emit('watch-track', { stream: e.streams[0] });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'signal', to: broadcasterId, data: { candidate: e.candidate } });
    };

    send({ type: 'signal', to: broadcasterId, data: { requestOffer: true } });
  }

  function stopWatching() {
    if (watchConnection) {
      watchConnection.close();
      watchConnection = null;
    }
    watchingId = null;
    emit('watch-stopped');
  }

  async function handleSignal(fromId, data) {
    if (data.requestOffer) {
      if (sharing) await createOfferFor(fromId);
      return;
    }

    if (data.sdp) {
      if (data.sdp.type === 'offer') {
        const pc = watchConnection;
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
      const pc = sharing ? broadcastConnections.get(fromId) : watchConnection;
      if (pc) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {
          console.warn('Erro ao adicionar ICE candidate:', e);
        }
      }
    }
  }

  function reset() {
    stopSharing();
    stopWatching();
  }

  return {
    on,
    startSharing,
    stopSharing,
    startWatching,
    stopWatching,
    handleSignal,
    reset,
    isSharing: () => sharing,
    watchingId: () => watchingId,
  };
})();
