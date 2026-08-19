const { signaling, webrtc } = TDG;

const lobbyEl = document.getElementById('lobby');
const roomScreenEl = document.getElementById('roomScreen');

const lobbyNameInput = document.getElementById('lobbyNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomListEl = document.getElementById('roomList');

const roomCodeLabel = document.getElementById('roomCodeLabel');
const nameInput = document.getElementById('nameInput');
const shareBtn = document.getElementById('shareBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const peersEl = document.getElementById('peers');
const viewerTitle = document.getElementById('viewerTitle');
const remoteVideo = document.getElementById('remoteVideo');

lobbyNameInput.value = signaling.myName();
nameInput.value = signaling.myName();

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 8);
}

function showLobby() {
  webrtc.reset();
  roomScreenEl.hidden = true;
  lobbyEl.hidden = false;
  remoteVideo.srcObject = null;
}

function showRoom(roomId) {
  roomCodeLabel.textContent = `Sala: ${roomId}`;
  lobbyEl.hidden = true;
  roomScreenEl.hidden = false;
}

joinRoomBtn.onclick = () => {
  const roomId = roomCodeInput.value.trim();
  if (!roomId) return;
  signaling.setMyName(lobbyNameInput.value || signaling.myName());
  signaling.joinRoom(roomId);
};

createRoomBtn.onclick = () => {
  signaling.setMyName(lobbyNameInput.value || signaling.myName());
  signaling.joinRoom(randomRoomCode());
};

function renderRoomList(rooms) {
  roomListEl.innerHTML = '';
  for (const r of rooms) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${r.id} — ${r.count} online`;
    li.appendChild(label);

    const btn = document.createElement('button');
    btn.textContent = 'Entrar';
    btn.onclick = () => {
      signaling.setMyName(lobbyNameInput.value || signaling.myName());
      signaling.joinRoom(r.id);
    };
    li.appendChild(btn);

    roomListEl.appendChild(li);
  }
}

leaveRoomBtn.onclick = () => {
  signaling.leaveRoom();
  showLobby();
};

shareBtn.onclick = async () => {
  if (!webrtc.isSharing()) {
    try {
      await webrtc.startSharing();
      shareBtn.textContent = 'Parar compartilhamento';
    } catch (err) {
      console.error('Não foi possível iniciar o compartilhamento:', err);
    }
  } else {
    webrtc.stopSharing();
  }
};

webrtc.on('sharing-stopped', () => {
  shareBtn.textContent = 'Compartilhar minha tela';
});

function renderPeers(list) {
  peersEl.innerHTML = '';
  for (const p of list) {
    if (p.id === signaling.myId()) continue;
    const li = document.createElement('li');
    const status = document.createElement('span');
    status.textContent = `${p.name} — ${p.broadcasting ? '🔴 transmitindo' : '⚪ parado'}`;
    li.appendChild(status);

    if (p.broadcasting) {
      const btn = document.createElement('button');
      const watching = webrtc.watchingId() === p.id;
      btn.textContent = watching ? 'Parar' : 'Assistir';
      btn.onclick = () => (watching ? stopWatching() : startWatching(p.id));
      li.appendChild(btn);
    }
    peersEl.appendChild(li);
  }
}

function startWatching(broadcasterId) {
  viewerTitle.textContent = 'Conectando...';
  webrtc.startWatching(broadcasterId);
}

function stopWatching() {
  webrtc.stopWatching();
  remoteVideo.srcObject = null;
  viewerTitle.textContent = 'Ninguém sendo assistido';
}

webrtc.on('watch-track', ({ stream }) => {
  remoteVideo.srcObject = stream;
  viewerTitle.textContent = 'Assistindo';
});

nameInput.onchange = () => {
  const name = nameInput.value || signaling.myName();
  lobbyNameInput.value = name;
  signaling.setName(name);
};

signaling.on('joined', ({ roomId }) => {
  showRoom(roomId);
});

signaling.on('room-list', ({ rooms }) => {
  renderRoomList(rooms);
});

signaling.on('presence', ({ clients }) => {
  renderPeers(clients);
});

signaling.on('signal', ({ from, data }) => {
  webrtc.handleSignal(from, data);
});

signaling.connect();
