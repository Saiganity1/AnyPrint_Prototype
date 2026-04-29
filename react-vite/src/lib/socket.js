import { io as clientIo } from 'socket.io-client';

let socket = null;

export function initSocket(baseUrl) {
  if (socket) return socket;
  socket = clientIo(baseUrl || window.location.origin, {
    transports: ['websocket'],
    withCredentials: true,
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
