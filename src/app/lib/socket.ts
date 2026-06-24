import { io, Socket } from 'socket.io-client';
import { config } from './config';
import { getToken } from './api';

let socket: Socket | null = null;

/**
 * Connect to the backend `/admin` namespace (Admins + Call Center agents).
 * Same-origin through the Vite proxy, so the session cookie is sent automatically;
 * the bearer token is also passed as a fallback.
 */
export function connectSocket(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(`${config.socketUrl}/admin`, {
    auth: { token: getToken() ?? undefined },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// --- Admin monitoring helpers ---
export function subscribeRide(rideId: string) {
  socket?.emit('subscribe:ride', rideId);
}
export function unsubscribeRide(rideId: string) {
  socket?.emit('unsubscribe:ride', rideId);
}
export function subscribeDriver(driverId: string) {
  socket?.emit('subscribe:driver', driverId);
}
