import { io as clientIo } from 'socket.io-client';

let socket = null;
let activeRoom = null;
let connectHandlerAttached = false;

export function initSocket(baseUrl) {
  if (socket && socket.connected) return socket;
  
  const backendUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || window.location.origin;
  // Extract the base URL without /api path
  const socketUrl = backendUrl.replace('/api', '');
  
  socket = clientIo(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  if (!connectHandlerAttached) {
    socket.on('connect', () => {
      if (activeRoom) {
        socket.emit('join', activeRoom);
      }
    });

    socket.on('reconnect', () => {
      if (activeRoom) {
        socket.emit('join', activeRoom);
      }
    });

    connectHandlerAttached = true;
  }
  
  return socket;
}

export function getSocket() {
  if (!socket) socket = initSocket();
  return socket;
}

export function joinSocketRoom(room) {
  if (!room) return;
  activeRoom = room;
  const s = getSocket();
  console.log('[Socket.js] joinSocketRoom called with room:', room, 'socket connected:', s.connected);
  if (s.connected) {
    console.log('[Socket.js] Emitting join event to room:', room);
    s.emit('join', room);
  } else {
    console.log('[Socket.js] Socket not connected yet, will join on reconnect');
  }
}

export function leaveSocketRoom(room) {
  if (!room) return;
  const s = getSocket();
  if (s.connected) {
    s.emit('leave', room);
  }
  if (activeRoom === room) {
    activeRoom = null;
  }
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeRoom = null;
    connectHandlerAttached = false;
  }
}
