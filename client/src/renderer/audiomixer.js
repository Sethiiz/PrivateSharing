window.TDG = window.TDG || {};

TDG.audioMixer = (() => {
  const SAMPLE_RATE = 48000;
  const CHANNELS = 2;

  const REFRESH_INTERVAL_MS = 2000;

  let ctx = null;
  let destination = null;
  let started = false;
  let unsubscribeChunk = null;
  let unsubscribeEnded = null;
  let refreshTimer = null;
  let refreshing = false;
  const nodes = new Map(); // pid -> { gainNode, nextStart }
  const blocked = new Set(); // pid bloqueado pelo usuário

  function ensureContext() {
    if (!ctx) {
      ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      destination = ctx.createMediaStreamDestination();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function ensureNode(pid) {
    let entry = nodes.get(pid);
    if (!entry) {
      const gainNode = ctx.createGain();
      gainNode.gain.value = blocked.has(pid) ? 0 : 1;
      gainNode.connect(destination);
      entry = { gainNode, nextStart: 0 };
      nodes.set(pid, entry);
    }
    return entry;
  }

  function handleChunk({ pid, samples }) {
    if (!started) return;
    const entry = nodes.get(pid);
    if (!entry) return;

    const frameCount = Math.floor(samples.length / CHANNELS);
    if (frameCount <= 0) return;

    const buffer = ctx.createBuffer(CHANNELS, frameCount, SAMPLE_RATE);
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.getChannelData(1);
    for (let i = 0; i < frameCount; i++) {
      ch0[i] = samples[i * 2];
      ch1[i] = samples[i * 2 + 1];
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(entry.gainNode);
    const startAt = Math.max(ctx.currentTime + 0.05, entry.nextStart);
    src.start(startAt);
    entry.nextStart = startAt + buffer.duration;
  }

  function startSession(pid) {
    ensureNode(pid);
    window.audioMixer.startCapture(pid);
  }

  function stopSession(pid) {
    window.audioMixer.stopCapture(pid);
    const entry = nodes.get(pid);
    if (entry) {
      entry.gainNode.disconnect();
      nodes.delete(pid);
    }
  }

  // A sessão de áudio do Windows aparece/some da enumeração o tempo todo (ex:
  // um instante de silêncio já tira o app da lista) sem que a captura em si
  // precise parar — quem avisa que precisa mesmo parar é o próprio módulo
  // nativo, via onEnded, quando o processo-alvo encerra de verdade. Por isso
  // esse refresh só ENTRA sessão nova; nunca derruba com base na ausência.
  async function refreshSessions() {
    const sessions = await window.audioMixer.listSessions();
    if (started) {
      for (const s of sessions) {
        if (!nodes.has(s.pid)) startSession(s.pid);
      }
    }
    return sessions;
  }

  async function start() {
    if (started) return destination.stream.getAudioTracks()[0];
    ensureContext();
    started = true;
    unsubscribeChunk = window.audioMixer.onChunk(handleChunk);
    unsubscribeEnded = window.audioMixer.onEnded(({ pid }) => stopSession(pid));

    const sessions = await window.audioMixer.listSessions();
    for (const s of sessions) startSession(s.pid);

    refreshTimer = setInterval(() => {
      if (refreshing) return;
      refreshing = true;
      refreshSessions()
        .catch(() => {})
        .finally(() => {
          refreshing = false;
        });
    }, REFRESH_INTERVAL_MS);

    return destination.stream.getAudioTracks()[0];
  }

  function stop() {
    if (!started) return;
    started = false;
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    for (const pid of [...nodes.keys()]) stopSession(pid);
    if (unsubscribeChunk) {
      unsubscribeChunk();
      unsubscribeChunk = null;
    }
    if (unsubscribeEnded) {
      unsubscribeEnded();
      unsubscribeEnded = null;
    }
    window.audioMixer.stopAll();

    // stopSharing() dá .stop() na faixa do destination, e uma faixa parada
    // não volta — então o próximo compartilhamento precisa de um contexto novo.
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
      destination = null;
    }
  }

  function toggleBlocked(pid) {
    if (blocked.has(pid)) blocked.delete(pid);
    else blocked.add(pid);
    const entry = nodes.get(pid);
    if (entry) entry.gainNode.gain.value = blocked.has(pid) ? 0 : 1;
  }

  function isBlocked(pid) {
    return blocked.has(pid);
  }

  return {
    start,
    stop,
    refreshSessions,
    toggleBlocked,
    isBlocked,
    isStarted: () => started,
  };
})();
