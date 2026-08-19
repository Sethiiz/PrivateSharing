// Troque pela URL do servidor de sinalização (wss:// se ele tiver HTTPS).
const SIGNAL_URL = 'wss://SEU-SERVIDOR-AQUI.onrender.com';

window.TDG = window.TDG || {};

TDG.signaling = (() => {
  let ws;
  let myId = null;
  let currentRoomId = null;
  const listeners = new Map();

  function on(type, cb) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(cb);
  }

  function emit(type, payload) {
    for (const cb of listeners.get(type) || []) cb(payload);
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function connect() {
    ws = new WebSocket(SIGNAL_URL);

    ws.onopen = () => {
      if (currentRoomId) send({ type: 'join-room', roomId: currentRoomId, name: TDG.signaling.myName() });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'welcome') {
        myId = msg.id;
        emit('welcome', msg);
      } else if (msg.type === 'joined') {
        currentRoomId = msg.roomId;
        emit('joined', msg);
      } else if (msg.type === 'room-list') {
        emit('room-list', msg);
      } else if (msg.type === 'presence') {
        emit('presence', msg);
      } else if (msg.type === 'signal') {
        emit('signal', msg);
      }
    };

    ws.onclose = () => setTimeout(connect, 2000);
    ws.onerror = () => ws.close();
  }

  let myName = localStorage.getItem('name') || `Amigo${Math.floor(Math.random() * 1000)}`;

  return {
    connect,
    send,
    on,
    myId: () => myId,
    myName: () => myName,
    setMyName: (name) => {
      myName = name;
      localStorage.setItem('name', myName);
    },
    joinRoom(roomId) {
      send({ type: 'join-room', roomId, name: myName });
    },
    leaveRoom() {
      currentRoomId = null;
      send({ type: 'leave-room' });
    },
    setName(name) {
      TDG.signaling.setMyName(name);
      send({ type: 'set-name', name });
    },
  };
})();
