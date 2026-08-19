const { signaling, webrtc, settings } = TDG;

const ICON_LOCK_CLOSED = '<svg width="13" height="13" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';
const ICON_LOCK_OPEN = '<svg width="13" height="13" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M5.5 7V5a2.5 2.5 0 014.7-1.2" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';
const ICON_FULLSCREEN = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 6V2h4M14 10v4h-4M14 6V2h-4M2 10v4h4" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';

// ---------- elementos ----------

const lobbyScreen = document.getElementById('lobbyScreen');
const roomScreen = document.getElementById('roomScreen');

const lobbyNameInput = document.getElementById('lobbyNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomListEl = document.getElementById('roomList');
const signalDot = document.getElementById('signalDot');
const signalStatusText = document.getElementById('signalStatusText');
const signalUrlLabel = document.getElementById('signalUrlLabel');

const createDialog = document.getElementById('createDialog');
const generatedCodeEl = document.getElementById('generatedCode');
const regenCodeBtn = document.getElementById('regenCodeBtn');
const radioSemSenha = document.getElementById('radioSemSenha');
const radioComSenha = document.getElementById('radioComSenha');
const createPasswordField = document.getElementById('createPasswordField');
const roomPasswordInput = document.getElementById('roomPasswordInput');
const cancelCreateBtn = document.getElementById('cancelCreateBtn');
const confirmCreateBtn = document.getElementById('confirmCreateBtn');

const passwordDialog = document.getElementById('passwordDialog');
const joinPasswordInput = document.getElementById('joinPasswordInput');
const passwordError = document.getElementById('passwordError');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');

const railTelas = document.getElementById('railTelas');
const railPessoas = document.getElementById('railPessoas');
const railChat = document.getElementById('railChat');
const openConfigBtn = document.getElementById('openConfigBtn');

const roomCodeText = document.getElementById('roomCodeText');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const streamsTag = document.getElementById('streamsTag');
const shareBtn = document.getElementById('shareBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

const configView = document.getElementById('configView');
const signalUrlInput = document.getElementById('signalUrlInput');
const testSignalBtn = document.getElementById('testSignalBtn');
const testSignalResult = document.getElementById('testSignalResult');
const iceStunOnly = document.getElementById('iceStunOnly');
const iceStunTurn = document.getElementById('iceStunTurn');
const turnFields = document.getElementById('turnFields');
const turnHostInput = document.getElementById('turnHostInput');
const turnUserInput = document.getElementById('turnUserInput');
const turnPassInput = document.getElementById('turnPassInput');
const audioModeSeg = document.getElementById('audioModeSeg');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');

const emptyView = document.getElementById('emptyView');
const emptyShareBtn = document.getElementById('emptyShareBtn');
const emptyRoomCode = document.getElementById('emptyRoomCode');

const errorView = document.getElementById('errorView');
const errorText = document.getElementById('errorText');
const retryNowBtn = document.getElementById('retryNowBtn');
const errorConfigBtn = document.getElementById('errorConfigBtn');

const mosaicView = document.getElementById('mosaicView');

const sharingBanner = document.getElementById('sharingBanner');
const sharingMeta = document.getElementById('sharingMeta');
const switchScreenBtn = document.getElementById('switchScreenBtn');
const stopShareBtn = document.getElementById('stopShareBtn');

const peopleHeading = document.getElementById('peopleHeading');
const peersEl = document.getElementById('peers');
const statRoute = document.getElementById('statRoute');
const statPing = document.getElementById('statPing');
const statLoss = document.getElementById('statLoss');
const statSignal = document.getElementById('statSignal');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

// ---------- estado ----------

let peers = [];
let pendingJoin = null;
let lastRoomList = [];
let showConfig = false;
const remoteStreams = new Map(); // broadcasterId -> MediaStream
const tileEls = new Map(); // 'self' | broadcasterId -> { el, videoEl }
const reconnecting = new Map(); // broadcasterId -> attempt (number) | 'gave-up'
const statsByPeer = new Map(); // peerId -> stats

lobbyNameInput.value = signaling.myName();
signalUrlLabel.textContent = settings.getSignalUrl();

// ---------- lobby ----------

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 8);
}

function currentName() {
  return lobbyNameInput.value.trim() || signaling.myName();
}

function showLobby() {
  webrtc.reset();
  remoteStreams.clear();
  tileEls.clear();
  reconnecting.clear();
  statsByPeer.clear();
  showConfig = false;
  roomScreen.hidden = true;
  lobbyScreen.hidden = false;
}

function showRoom(roomId) {
  roomCodeText.textContent = roomId;
  emptyRoomCode.textContent = roomId;
  lobbyScreen.hidden = true;
  roomScreen.hidden = false;
  render();
}

function attemptJoin(roomId, hasPassword) {
  signaling.setMyName(currentName());
  pendingJoin = { roomId };
  if (hasPassword) {
    passwordError.hidden = true;
    joinPasswordInput.value = '';
    showDialog(passwordDialog);
  } else {
    signaling.joinRoom(roomId);
  }
}

joinRoomBtn.onclick = () => {
  const roomId = roomCodeInput.value.trim();
  if (!roomId) return;
  const known = lastRoomList.find((r) => r.id === roomId.toLowerCase());
  attemptJoin(roomId, known ? known.hasPassword : false);
};

function renderRoomList(rooms) {
  lastRoomList = rooms;
  roomListEl.innerHTML = '';
  for (const r of rooms) {
    const row = document.createElement('div');
    row.className = 'roomRow';

    const lock = document.createElement('span');
    lock.className = 'roomLock' + (r.hasPassword ? ' locked' : '');
    lock.title = r.hasPassword ? 'Sala com senha' : 'Sala aberta';
    lock.innerHTML = r.hasPassword ? ICON_LOCK_CLOSED : ICON_LOCK_OPEN;

    const code = document.createElement('span');
    code.className = 'mono accent roomCode';
    code.textContent = r.id;

    const meta = document.createElement('span');
    meta.className = 'text-muted roomMeta';
    meta.textContent = `${r.count} online · ${r.hasPassword ? 'pede senha' : 'aberta'}`;

    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost roomEnterBtn';
    btn.textContent = 'Entrar';
    btn.onclick = () => attemptJoin(r.id, r.hasPassword);

    row.append(lock, code, meta, btn);
    roomListEl.appendChild(row);
  }
}

// ---------- diálogos ----------

function showDialog(el) {
  el.hidden = false;
}
function hideDialog(el) {
  el.hidden = true;
}

createRoomBtn.onclick = () => {
  generatedCodeEl.textContent = randomRoomCode();
  radioSemSenha.checked = true;
  createPasswordField.hidden = true;
  roomPasswordInput.value = '';
  showDialog(createDialog);
};
regenCodeBtn.onclick = () => {
  generatedCodeEl.textContent = randomRoomCode();
};
radioSemSenha.onchange = () => (createPasswordField.hidden = true);
radioComSenha.onchange = () => (createPasswordField.hidden = false);
cancelCreateBtn.onclick = () => hideDialog(createDialog);
confirmCreateBtn.onclick = () => {
  signaling.setMyName(currentName());
  const roomId = generatedCodeEl.textContent;
  pendingJoin = { roomId };
  signaling.joinRoom(roomId, radioComSenha.checked ? roomPasswordInput.value : undefined);
};

cancelPasswordBtn.onclick = () => {
  pendingJoin = null;
  hideDialog(passwordDialog);
};
confirmPasswordBtn.onclick = () => {
  if (!pendingJoin) return;
  signaling.joinRoom(pendingJoin.roomId, joinPasswordInput.value);
};

// ---------- sala: cabeçalho ----------

leaveRoomBtn.onclick = () => {
  signaling.leaveRoom();
  showLobby();
};

copyCodeBtn.onclick = () => {
  navigator.clipboard.writeText(roomCodeText.textContent).then(() => {
    const original = copyCodeBtn.textContent;
    copyCodeBtn.textContent = 'Copiado!';
    setTimeout(() => (copyCodeBtn.textContent = original), 1200);
  });
};

// ---------- compartilhar ----------

async function doStartSharing() {
  try {
    await webrtc.startSharing();
  } catch (err) {
    console.error('Não foi possível iniciar o compartilhamento:', err);
  }
  render();
}

emptyShareBtn.onclick = doStartSharing;
stopShareBtn.onclick = () => {
  webrtc.stopSharing();
  render();
};
switchScreenBtn.onclick = async () => {
  try {
    await webrtc.switchScreen();
  } catch (err) {
    console.error('Não foi possível trocar de tela:', err);
  }
};

webrtc.on('sharing-started', () => render());
webrtc.on('sharing-stopped', () => render());
webrtc.on('watcher-count', () => render());

// ---------- assistir (mosaico) ----------

webrtc.on('watch-track', ({ broadcasterId, stream }) => {
  remoteStreams.set(broadcasterId, stream);
  render();
});
webrtc.on('watch-stopped', ({ broadcasterId }) => {
  remoteStreams.delete(broadcasterId);
  tileEls.delete(broadcasterId);
  reconnecting.delete(broadcasterId);
  statsByPeer.delete(broadcasterId);
  render();
});
webrtc.on('watch-reconnecting', ({ broadcasterId, attempt }) => {
  reconnecting.set(broadcasterId, attempt);
  render();
});
webrtc.on('watch-recovered', ({ broadcasterId }) => {
  reconnecting.delete(broadcasterId);
  render();
});
webrtc.on('watch-gave-up', ({ broadcasterId }) => {
  reconnecting.set(broadcasterId, 'gave-up');
  render();
});

retryNowBtn.onclick = () => {
  const [broadcasterId] = reconnecting.keys();
  if (broadcasterId) webrtc.retryNow(broadcasterId);
};
errorConfigBtn.onclick = () => {
  showConfig = true;
  render();
};

function peerName(id) {
  const p = peers.find((x) => x.id === id);
  return p ? p.name : 'alguém';
}

function tileBasis(count) {
  if (count <= 1) return '78%';
  return 'calc(50% - 6px)';
}

function renderMosaic() {
  const activeIds = [];
  if (webrtc.isSharing()) activeIds.push('self');
  for (const id of remoteStreams.keys()) activeIds.push(id);

  for (const id of [...tileEls.keys()]) {
    if (!activeIds.includes(id)) {
      tileEls.get(id).el.remove();
      tileEls.delete(id);
    }
  }

  const basis = tileBasis(activeIds.length);

  for (const id of activeIds) {
    let entry = tileEls.get(id);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'tile live';
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = id === 'self';
      const badge = document.createElement('div');
      badge.className = 'tileBadge';
      badge.innerHTML = '<span class="liveDot"></span><span class="tileBadgeName"></span><span class="tileMeta"></span>';
      const actions = document.createElement('div');
      actions.className = 'tileActions';
      const fsBtn = document.createElement('button');
      fsBtn.className = 'btn btn-secondary btn-icon';
      fsBtn.title = 'Tela cheia';
      fsBtn.innerHTML = ICON_FULLSCREEN;
      fsBtn.onclick = () => video.requestFullscreen();
      actions.appendChild(fsBtn);
      el.append(video, badge, actions);
      mosaicView.appendChild(el);
      entry = { el, videoEl: video, badgeName: badge.querySelector('.tileBadgeName'), badgeMeta: badge.querySelector('.tileMeta') };
      tileEls.set(id, entry);
    }
    entry.el.style.flexBasis = basis;
    entry.el.style.maxWidth = basis;

    const stream = id === 'self' ? webrtc.getLocalStream() : remoteStreams.get(id);
    if (stream && entry.videoEl.srcObject !== stream) entry.videoEl.srcObject = stream;

    entry.badgeName.textContent = id === 'self' ? 'Você' : peerName(id);
    const s = statsByPeer.get(id);
    entry.badgeMeta.textContent = s ? statsMetaText(s) : '';
  }

  mosaicView.hidden = activeIds.length === 0;
}

function statsMetaText(s) {
  const fps = s.fps != null ? `${Math.round(s.fps)} fps` : '';
  const kbps = s.kbps != null ? (s.kbps >= 1000 ? `${(s.kbps / 1000).toFixed(1)} Mbps` : `${s.kbps} kbps`) : '';
  return [fps, kbps].filter(Boolean).join(' · ');
}

webrtc.on('stats', (s) => {
  statsByPeer.set(s.peerId, s);
  const entry = tileEls.get(s.peerId);
  if (entry) entry.badgeMeta.textContent = statsMetaText(s);
  updateSidebarStats();
});

function updateSidebarStats() {
  let s = null;
  for (const id of remoteStreams.keys()) {
    if (statsByPeer.has(id)) {
      s = statsByPeer.get(id);
      break;
    }
  }
  if (!s) {
    for (const v of statsByPeer.values()) {
      if (v.role === 'broadcast') {
        s = v;
        break;
      }
    }
  }
  statRoute.textContent = s ? (s.route === 'turn' ? 'via TURN' : 'P2P direto') : '—';
  statPing.textContent = s && s.rttMs != null ? `${s.rttMs} ms` : '—';
  statLoss.textContent = s && s.lossPct != null ? `${s.lossPct}%` : '—';
}

// ---------- pessoas ----------

function renderPeers() {
  peopleHeading.textContent = `Na sala · ${peers.length}`;
  peersEl.innerHTML = '';
  for (const p of peers) {
    const isMe = p.id === signaling.myId();
    const row = document.createElement('div');
    row.className = 'peerRow' + (isMe ? ' me' : '');

    const avatar = document.createElement('span');
    avatar.className = 'peerAvatar' + (isMe ? ' accent' : '');
    avatar.textContent = (p.name || '?').charAt(0).toUpperCase();

    const name = document.createElement('span');
    name.className = 'peerName';
    name.textContent = p.name;

    const status = document.createElement('span');
    status.className = 'peerStatus';
    status.textContent = isMe ? (webrtc.isSharing() ? 'você · transmitindo' : 'você') : p.broadcasting ? 'transmitindo' : '';

    row.append(avatar, name, status);
    peersEl.appendChild(row);
  }
}

// ---------- chat ----------

function renderChatMessage(msg) {
  const wrap = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'chatMsgMeta';
  const time = new Date(msg.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  meta.textContent = `${msg.name} · ${time}`;
  const bubble = document.createElement('div');
  bubble.className = 'chatMsgBubble' + (msg.from === signaling.myId() ? ' me' : '');
  bubble.textContent = msg.text;
  wrap.append(meta, bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatInput.onkeydown = (e) => {
  if (e.key !== 'Enter') return;
  const text = chatInput.value.trim();
  if (!text) return;
  signaling.sendChat(text);
  chatInput.value = '';
};

signaling.on('chat', renderChatMessage);

// ---------- rail ----------

function setActiveRail(btn) {
  for (const b of [railTelas, railPessoas, railChat]) b.classList.remove('active');
  btn.classList.add('active');
}
railTelas.onclick = () => {
  showConfig = false;
  setActiveRail(railTelas);
  render();
};
railPessoas.onclick = () => {
  setActiveRail(railPessoas);
  document.querySelector('.sidebarPeople').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};
railChat.onclick = () => {
  setActiveRail(railChat);
  document.querySelector('.sidebarChat').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ---------- configurações ----------

function openConfig() {
  signalUrlInput.value = settings.getSignalUrl();
  const turn = settings.getTurn();
  iceStunOnly.checked = !turn.enabled;
  iceStunTurn.checked = turn.enabled;
  turnFields.hidden = !turn.enabled;
  turnHostInput.value = turn.host;
  turnUserInput.value = turn.user;
  turnPassInput.value = turn.pass;
  testSignalResult.textContent = '';
  const audioMode = settings.getAudioMode();
  for (const input of audioModeSeg.querySelectorAll('input')) input.checked = input.value === audioMode;
  showConfig = true;
  render();
}

openConfigBtn.onclick = openConfig;
iceStunOnly.onchange = () => (turnFields.hidden = true);
iceStunTurn.onchange = () => (turnFields.hidden = false);

cancelConfigBtn.onclick = () => {
  showConfig = false;
  render();
};

saveConfigBtn.onclick = () => {
  const newUrl = signalUrlInput.value.trim() || settings.DEFAULT_SIGNAL_URL;
  const urlChanged = newUrl !== settings.getSignalUrl();
  settings.setSignalUrl(newUrl);

  settings.setTurn({
    enabled: iceStunTurn.checked,
    host: turnHostInput.value.trim(),
    user: turnUserInput.value.trim(),
    pass: turnPassInput.value,
  });

  const audioInput = audioModeSeg.querySelector('input:checked');
  if (audioInput) settings.setAudioMode(audioInput.value);

  signalUrlLabel.textContent = newUrl;
  if (urlChanged) signaling.connect();

  showConfig = false;
  render();
};

testSignalBtn.onclick = () => {
  testSignalResult.textContent = 'Testando…';
  const url = signalUrlInput.value.trim();
  let settled = false;
  let testWs;
  try {
    testWs = new WebSocket(url);
  } catch {
    testSignalResult.textContent = 'URL inválida.';
    return;
  }
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    testSignalResult.textContent = 'Não respondeu a tempo.';
    testWs.close();
  }, 4000);
  testWs.onmessage = (event) => {
    if (settled) return;
    const msg = JSON.parse(event.data);
    if (msg.type === 'welcome') {
      settled = true;
      clearTimeout(timeout);
      testSignalResult.textContent = 'Conectado com sucesso.';
      testWs.close();
    }
  };
  testWs.onerror = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    testSignalResult.textContent = 'Erro ao conectar.';
  };
};

// ---------- reconciliação de tela ----------

function render() {
  configView.hidden = !showConfig;

  const [reconnectingId] = reconnecting.keys();
  const showError = !showConfig && reconnectingId !== undefined;
  errorView.hidden = !showError;
  if (showError) {
    const attempt = reconnecting.get(reconnectingId);
    errorText.textContent =
      attempt === 'gave-up'
        ? `Não foi possível reconectar com ${peerName(reconnectingId)}.`
        : `A conexão direta com ${peerName(reconnectingId)} caiu. Tentando de novo — tentativa ${attempt} de 5.`;
  }

  const tileCount = (webrtc.isSharing() ? 1 : 0) + remoteStreams.size;
  const showEmpty = !showConfig && !showError && tileCount === 0;
  emptyView.hidden = !showEmpty;

  const showMosaic = !showConfig && !showError && tileCount > 0;
  if (showMosaic) renderMosaic();
  else mosaicView.hidden = true;

  streamsTag.textContent = tileCount === 0 ? 'nenhuma tela ativa' : tileCount === 1 ? '1 tela ativa' : `${tileCount} telas ativas`;

  shareBtn.textContent = webrtc.isSharing() ? 'Parar de compartilhar' : 'Compartilhar minha tela';
  shareBtn.onclick = () => (webrtc.isSharing() ? (webrtc.stopSharing(), render()) : doStartSharing());

  sharingBanner.hidden = !webrtc.isSharing();
  if (webrtc.isSharing()) {
    const n = webrtc.getWatcherCount();
    sharingMeta.textContent = `${n} ${n === 1 ? 'pessoa assistindo' : 'pessoas assistindo'}`;
  }

  renderPeers();
  updateSidebarStats();
}

// ---------- sinalização ----------

function setSignalStatus(text, connected) {
  signalStatusText.textContent = text;
  signalDot.classList.toggle('on', connected);
  statSignal.textContent = connected ? 'conectada' : text;
}

signaling.on('connecting', () => setSignalStatus('Conectando…', false));
signaling.on('connected', () => setSignalStatus('Sinalização conectada', true));
signaling.on('disconnected', () => setSignalStatus('Sinalização caiu — reconectando…', false));

signaling.on('joined', ({ roomId }) => {
  pendingJoin = null;
  hideDialog(createDialog);
  hideDialog(passwordDialog);
  showRoom(roomId);
});

signaling.on('join-error', () => {
  if (!pendingJoin) return;
  passwordError.hidden = false;
  showDialog(passwordDialog);
});

signaling.on('room-list', ({ rooms }) => renderRoomList(rooms));

signaling.on('presence', ({ clients }) => {
  peers = clients;
  const broadcasterIds = peers.filter((p) => p.broadcasting && p.id !== signaling.myId()).map((p) => p.id);
  webrtc.watchAll(broadcasterIds);
  render();
});

signaling.on('signal', ({ from, data }) => {
  webrtc.handleSignal(from, data);
});

signaling.connect();
