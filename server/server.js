const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Signaling server do Private Sharing está no ar.');
});
const wss = new WebSocket.Server({ server });

// clientId -> { ws, name, roomId, broadcasting }
const clients = new Map();
// roomId -> { members: Set<clientId>, passwordHash: string|null }
const rooms = new Map();
let nextId = 1;

function sanitizeRoomId(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function roomMembers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.members].map((id) => clients.get(id)).filter(Boolean);
}

function broadcastPresence(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const list = [...room.members].map((id) => {
    const c = clients.get(id);
    return { id, name: c.name, broadcasting: c.broadcasting };
  });
  const msg = JSON.stringify({ type: 'presence', clients: list });
  for (const c of roomMembers(roomId)) {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  }
}

function broadcastRoomList() {
  const list = [...rooms.entries()].map(([id, room]) => ({
    id,
    count: room.members.size,
    hasPassword: !!room.passwordHash,
  }));
  const msg = JSON.stringify({ type: 'room-list', rooms: list });
  for (const c of clients.values()) {
    if (c.roomId === null && c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  }
}

function joinRoom(id, rawRoomId, password) {
  const me = clients.get(id);
  if (!me) return;

  const roomId = sanitizeRoomId(rawRoomId);
  if (!roomId) return;

  const existing = rooms.get(roomId);
  if (existing && existing.passwordHash && existing.passwordHash !== hashPassword(password)) {
    me.ws.send(JSON.stringify({ type: 'join-error', reason: 'wrong-password' }));
    return;
  }

  leaveRoom(id);

  if (!existing) {
    rooms.set(roomId, {
      members: new Set(),
      passwordHash: password ? hashPassword(password) : null,
    });
  }
  rooms.get(roomId).members.add(id);
  me.roomId = roomId;

  me.ws.send(JSON.stringify({ type: 'joined', roomId }));
  broadcastPresence(roomId);
  broadcastRoomList();
}

function leaveRoom(id) {
  const me = clients.get(id);
  if (!me || me.roomId === null) return;

  const oldRoomId = me.roomId;
  me.roomId = null;
  me.broadcasting = false;

  const room = rooms.get(oldRoomId);
  if (room) {
    room.members.delete(id);
    if (room.members.size === 0) rooms.delete(oldRoomId);
  }

  broadcastPresence(oldRoomId);
  broadcastRoomList();
}

wss.on('connection', (ws) => {
  const id = String(nextId++);
  clients.set(id, { ws, name: `Amigo ${id}`, roomId: null, broadcasting: false });
  ws.send(JSON.stringify({ type: 'welcome', id }));
  broadcastRoomList();

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const me = clients.get(id);
    if (!me) return;

    switch (msg.type) {
      case 'join-room':
        me.name = String(msg.name || me.name).slice(0, 40);
        joinRoom(id, msg.roomId, msg.password);
        break;

      case 'leave-room':
        leaveRoom(id);
        break;

      case 'set-name':
        me.name = String(msg.name || me.name).slice(0, 40);
        if (me.roomId !== null) broadcastPresence(me.roomId);
        break;

      case 'start-share':
        if (me.roomId === null) return;
        me.broadcasting = true;
        broadcastPresence(me.roomId);
        break;

      case 'stop-share':
        if (me.roomId === null) return;
        me.broadcasting = false;
        broadcastPresence(me.roomId);
        break;

      case 'chat': {
        if (me.roomId === null) return;
        const text = String(msg.text || '').slice(0, 500).trim();
        if (!text) return;
        const chatMsg = JSON.stringify({
          type: 'chat',
          from: id,
          name: me.name,
          text,
          at: Date.now(),
        });
        for (const c of roomMembers(me.roomId)) {
          if (c.ws.readyState === WebSocket.OPEN) c.ws.send(chatMsg);
        }
        break;
      }

      case 'signal': {
        const target = clients.get(msg.to);
        if (
          target &&
          me.roomId !== null &&
          target.roomId === me.roomId &&
          target.ws.readyState === WebSocket.OPEN
        ) {
          target.ws.send(
            JSON.stringify({
              type: 'signal',
              from: id,
              data: msg.data,
            })
          );
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    leaveRoom(id);
    clients.delete(id);
  });
});

server.listen(PORT, () => console.log(`Signaling server ouvindo na porta ${PORT}`));
