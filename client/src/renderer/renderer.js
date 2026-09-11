const { signaling, webrtc, settings, theme, audioMixer: appAudioMixer } = TDG;

theme.apply(settings.getTheme());

const ICON_LOCK_CLOSED = '<svg width="13" height="13" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';
const ICON_LOCK_OPEN = '<svg width="13" height="13" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M5.5 7V5a2.5 2.5 0 014.7-1.2" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';
const ICON_FULLSCREEN = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 6V2h4M14 10v4h-4M14 6V2h-4M2 10v4h4" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';
const ICON_VOLUME_ON = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 6v4h3l4 3V3L5 6H2z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M11 5.5a4 4 0 010 5" fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>';
const ICON_VOLUME_OFF = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 6v4h3l4 3V3L5 6H2z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M10.5 6.5l3 3M13.5 6.5l-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>';
const ICON_EYE_OPEN = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.2"></path><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.2"></circle></svg>';
const ICON_EYE_CLOSED = '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M2 2l12 12M4.3 4.6C2.6 5.7 1 8 1 8s2.5 4.5 7 4.5c1.4 0 2.6-.4 3.6-1M9.9 9.9A2 2 0 016.1 6.1M7 3.6c.3 0 .6-.1 1-.1 4.5 0 7 4.5 7 4.5s-.6 1.1-1.7 2.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path></svg>';

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
const openConfigBtn = document.getElementById('openConfigBtn');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

const roomCodeText = document.getElementById('roomCodeText');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const streamsTag = document.getElementById('streamsTag');
const shareBtn = document.getElementById('shareBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const updateBtn = document.getElementById('updateBtn');

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
const shareQualitySeg = document.getElementById('shareQualitySeg');
const themeSwatches = document.getElementById('themeSwatches');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');

const emptyView = document.getElementById('emptyView');
const emptyTitle = document.getElementById('emptyTitle');
const emptySubtitle = document.getElementById('emptySubtitle');
const emptyShareBtn = document.getElementById('emptyShareBtn');
const emptyRoomCode = document.getElementById('emptyRoomCode');

const errorView = document.getElementById('errorView');
const errorText = document.getElementById('errorText');
const retryNowBtn = document.getElementById('retryNowBtn');
const errorConfigBtn = document.getElementById('errorConfigBtn');

const mosaicView = document.getElementById('mosaicView');

const sharingBanner = document.getElementById('sharingBanner');
const sharingMeta = document.getElementById('sharingMeta');
const audioMixerBtn = document.getElementById('audioMixerBtn');
const switchScreenBtn = document.getElementById('switchScreenBtn');
const stopShareBtn = document.getElementById('stopShareBtn');

const audioMixerDialog = document.getElementById('audioMixerDialog');
const audioMixerGrid = document.getElementById('audioMixerGrid');
const audioMixerEmpty = document.getElementById('audioMixerEmpty');
const closeAudioMixerBtn = document.getElementById('closeAudioMixerBtn');

const patchNotesDialog = document.getElementById('patchNotesDialog');
const patchNotesVersion = document.getElementById('patchNotesVersion');
const patchNotesList = document.getElementById('patchNotesList');
const closePatchNotesBtn = document.getElementById('closePatchNotesBtn');

const peopleHeading = document.getElementById('peopleHeading');
const peersEl = document.getElementById('peers');
const statRoute = document.getElementById('statRoute');
const statPing = document.getElementById('statPing');
const statLoss = document.getElementById('statLoss');
const statSignal = document.getElementById('statSignal');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

const broadcastBanners = document.getElementById('broadcastBanners');

// ---------- estado ----------

let peers = [];
let pendingJoin = null;
let lastRoomList = [];
let showConfig = false;
const remoteStreams = new Map(); // broadcasterId -> MediaStream
const tileEls = new Map(); // 'self' | broadcasterId -> { el, videoEl }
const reconnecting = new Map(); // broadcasterId -> attempt (number) | 'gave-up'
const statsByPeer = new Map(); // peerId -> stats
const includedWatch = new Set(); // broadcasterId que o usuário escolheu assistir
const mutedTiles = new Set(); // broadcasterId com áudio desligado no mosaico
const activeBanners = new Map(); // broadcasterId -> elemento do banner de "está transmitindo"
const dismissedBroadcasts = new Set(); // broadcasterId dispensado enquanto essa transmissão durar
let knownBroadcasting = new Set(); // broadcasterId que já estava transmitindo na última presence

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
  includedWatch.clear();
  mutedTiles.clear();
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

// ---------- áudio por app ----------

function appInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

async function renderAudioMixerGrid() {
  const sessions = await appAudioMixer.refreshSessions();
  audioMixerGrid.innerHTML = '';
  audioMixerEmpty.hidden = sessions.length > 0;

  for (const s of sessions) {
    const cell = document.createElement('button');
    cell.className = 'audioMixerCell' + (appAudioMixer.isBlocked(s.pid) ? ' blocked' : '');
    cell.title = s.name;

    if (s.icon) {
      const img = document.createElement('img');
      img.src = s.icon;
      cell.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'audioMixerCellFallback';
      fallback.textContent = appInitial(s.name);
      cell.appendChild(fallback);
    }

    const label = document.createElement('span');
    label.textContent = s.name;
    cell.appendChild(label);

    cell.onclick = () => {
      appAudioMixer.toggleBlocked(s.pid);
      cell.classList.toggle('blocked', appAudioMixer.isBlocked(s.pid));
    };

    audioMixerGrid.appendChild(cell);
  }
}

audioMixerBtn.onclick = () => {
  showDialog(audioMixerDialog);
  renderAudioMixerGrid();
};
closeAudioMixerBtn.onclick = () => hideDialog(audioMixerDialog);

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
  reconnecting.delete(broadcasterId);
  statsByPeer.delete(broadcasterId);
  mutedTiles.delete(broadcasterId);
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
  const columns = Math.ceil(Math.sqrt(count));
  const gapPx = 12;
  const compensate = (gapPx * (columns - 1)) / columns;
  return `calc(${100 / columns}% - ${compensate}px)`;
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
      video.muted = id === 'self' || mutedTiles.has(id);
      const badge = document.createElement('div');
      badge.className = 'tileBadge';
      badge.innerHTML = '<span class="liveDot"></span><span class="tileBadgeName"></span><span class="tileMeta"></span>';
      const actions = document.createElement('div');
      actions.className = 'tileActions';
      if (id !== 'self') {
        const muteBtn = document.createElement('button');
        muteBtn.className = 'btn btn-secondary btn-icon';
        const syncMuteIcon = () => {
          muteBtn.title = video.muted ? 'Ativar áudio' : 'Silenciar';
          muteBtn.innerHTML = video.muted ? ICON_VOLUME_OFF : ICON_VOLUME_ON;
        };
        syncMuteIcon();
        muteBtn.onclick = () => {
          video.muted = !video.muted;
          if (video.muted) mutedTiles.add(id);
          else mutedTiles.delete(id);
          syncMuteIcon();
        };
        actions.appendChild(muteBtn);
      }
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

    const trailing = document.createElement('div');
    trailing.className = 'peerTrailing';
    if (!isMe && p.broadcasting) {
      const watching = includedWatch.has(p.id);
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'peerIconBtn' + (watching ? '' : ' off');
      eyeBtn.title = watching ? 'Parar de assistir' : 'Assistir';
      eyeBtn.innerHTML = watching ? ICON_EYE_OPEN : ICON_EYE_CLOSED;
      eyeBtn.onclick = () => toggleWatch(p.id);
      trailing.appendChild(eyeBtn);
    }
    trailing.appendChild(status);

    row.append(avatar, name, trailing);
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

railTelas.onclick = () => {
  showConfig = false;
  railTelas.classList.add('active');
  render();
};

// ---------- sidebar recolhível ----------

function applySidebarCollapsed(collapsed) {
  roomScreen.classList.toggle('sidebar-collapsed', collapsed);
  sidebarToggleBtn.title = collapsed ? 'Expandir painel' : 'Recolher painel';
}
applySidebarCollapsed(settings.getSidebarCollapsed());
sidebarToggleBtn.onclick = () => {
  const collapsed = !roomScreen.classList.contains('sidebar-collapsed');
  applySidebarCollapsed(collapsed);
  settings.setSidebarCollapsed(collapsed);
};

// ---------- configurações ----------

for (const [id, preset] of Object.entries(theme.PRESETS)) {
  const btn = document.createElement('button');
  btn.className = 'themeSwatch';
  btn.type = 'button';
  btn.title = preset.label;
  btn.style.background = preset.accent;
  btn.onclick = () => {
    theme.apply(id);
    settings.setTheme(id);
    highlightActiveTheme();
  };
  themeSwatches.appendChild(btn);
}

function highlightActiveTheme() {
  const current = settings.getTheme();
  const ids = Object.keys(theme.PRESETS);
  themeSwatches.querySelectorAll('.themeSwatch').forEach((btn, i) => {
    btn.classList.toggle('active', ids[i] === current);
  });
}

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
  const shareQuality = settings.getShareQuality();
  for (const input of shareQualitySeg.querySelectorAll('input')) input.checked = input.value === shareQuality;
  highlightActiveTheme();
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

  const qualityInput = shareQualitySeg.querySelector('input:checked');
  if (qualityInput) settings.setShareQuality(qualityInput.value);

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
  if (showEmpty) {
    const someoneElseBroadcasting = peers.some((p) => p.broadcasting && p.id !== signaling.myId());
    if (someoneElseBroadcasting) {
      emptyTitle.textContent = 'Ninguém sendo assistido';
      emptySubtitle.textContent = 'Tem gente compartilhando na sala — clique no ícone de olho ao lado do nome, na lista à direita, pra assistir.';
    } else {
      emptyTitle.textContent = 'Ninguém está compartilhando';
      emptySubtitle.textContent = 'Assim que alguém da sala começar, você pode escolher assistir. Você também pode começar a compartilhar.';
    }
  }

  const showMosaic = !showConfig && !showError && tileCount > 0;
  renderMosaic();
  mosaicView.hidden = !showMosaic;

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

signaling.on('reconnected', () => {
  webrtc.resyncConnections();
  reconnecting.clear();
  render();
});

signaling.on('joined', ({ roomId }) => {
  pendingJoin = null;
  hideDialog(createDialog);
  hideDialog(passwordDialog);
  showRoom(roomId);
  // Reconectou compartilhando: o entry novo no servidor veio com broadcasting: false.
  if (webrtc.isSharing()) signaling.send({ type: 'start-share' });
});

signaling.on('join-error', () => {
  if (!pendingJoin) return;
  passwordError.hidden = false;
  showDialog(passwordDialog);
});

signaling.on('room-list', ({ rooms }) => renderRoomList(rooms));

signaling.on('presence', ({ clients }) => {
  const nowBroadcasting = new Set(clients.filter((p) => p.broadcasting && p.id !== signaling.myId()).map((p) => p.id));
  for (const id of nowBroadcasting) {
    if (!knownBroadcasting.has(id)) showBroadcastBanner(id, clients);
  }
  for (const id of knownBroadcasting) {
    if (!nowBroadcasting.has(id)) {
      removeBroadcastBanner(id);
      dismissedBroadcasts.delete(id);
    }
  }
  knownBroadcasting = nowBroadcasting;

  peers = clients;
  refreshWatch();
  render();
});

function refreshWatch() {
  const activeBroadcastIds = new Set(peers.filter((p) => p.broadcasting && p.id !== signaling.myId()).map((p) => p.id));
  for (const id of [...includedWatch]) if (!activeBroadcastIds.has(id)) includedWatch.delete(id);
  const desired = [...activeBroadcastIds].filter((id) => includedWatch.has(id));
  webrtc.watchAll(desired);
}

function toggleWatch(id) {
  if (includedWatch.has(id)) includedWatch.delete(id);
  else includedWatch.add(id);
  removeBroadcastBanner(id);
  refreshWatch();
  render();
}

// ---------- banner de "está transmitindo" ----------

function showBroadcastBanner(id, clientsList) {
  if (includedWatch.has(id) || dismissedBroadcasts.has(id) || activeBanners.has(id)) return;
  const p = clientsList.find((c) => c.id === id);
  const name = p ? p.name : 'alguém';

  const el = document.createElement('div');
  el.className = 'broadcastBanner';

  const avatar = document.createElement('span');
  avatar.className = 'peerAvatar';
  avatar.textContent = (name || '?').charAt(0).toUpperCase();

  const text = document.createElement('span');
  text.className = 'broadcastBannerText';
  text.textContent = `${name} está transmitindo`;

  const actions = document.createElement('div');
  actions.className = 'broadcastBannerActions';

  const eyeBtn = document.createElement('button');
  eyeBtn.className = 'btn btn-secondary btn-icon';
  eyeBtn.title = 'Assistir';
  eyeBtn.innerHTML = ICON_EYE_CLOSED;
  eyeBtn.onclick = () => toggleWatch(id);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary btn-icon';
  closeBtn.title = 'Dispensar';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    dismissedBroadcasts.add(id);
    removeBroadcastBanner(id);
  };

  actions.append(eyeBtn, closeBtn);
  el.append(avatar, text, actions);
  broadcastBanners.appendChild(el);
  activeBanners.set(id, el);
}

function removeBroadcastBanner(id) {
  const el = activeBanners.get(id);
  if (el) {
    el.remove();
    activeBanners.delete(id);
  }
}

signaling.on('signal', ({ from, data }) => {
  webrtc.handleSignal(from, data);
});

// ---------- atualização automática ----------

updateBtn.onclick = () => window.appUpdater.install();
window.appUpdater.onDownloaded(() => {
  updateBtn.hidden = false;
});

const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const checkUpdateResult = document.getElementById('checkUpdateResult');
checkUpdateBtn.onclick = async () => {
  checkUpdateResult.textContent = 'Verificando…';
  const result = await window.appUpdater.checkNow();
  if (result.status === 'up-to-date') checkUpdateResult.textContent = 'Já está na versão mais recente.';
  else if (result.status === 'available') checkUpdateResult.textContent = `Encontrou a versão ${result.version} — baixando em segundo plano.`;
  else checkUpdateResult.textContent = `Erro ao verificar: ${result.message}`;
};

// ---------- novidades da versão ----------

closePatchNotesBtn.onclick = () => hideDialog(patchNotesDialog);

async function checkPatchNotes() {
  const version = await window.appInfo.getVersion();
  document.getElementById('appVersionText').textContent = `Versão ${version}`;
  const lastSeen = localStorage.getItem('lastSeenVersion');
  const notes = TDG.patchNotes[version];
  if (lastSeen && lastSeen !== version && notes) {
    patchNotesVersion.textContent = version;
    patchNotesList.innerHTML = '';
    for (const line of notes) {
      const li = document.createElement('li');
      li.textContent = line;
      patchNotesList.appendChild(li);
    }
    showDialog(patchNotesDialog);
  }
  localStorage.setItem('lastSeenVersion', version);
}
checkPatchNotes();

signaling.connect();
