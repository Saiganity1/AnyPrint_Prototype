import { io as clientIo } from 'socket.io-client';

let socket = null;

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
  
  return socket;
}

export function getSocket() {
  if (!socket) socket = initSocket();
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
