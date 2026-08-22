import { io, Socket } from 'socket.io-client';
import { config } from './config';
import { getToken } from './api';

let socket: Socket | null = null;
let mapSubs = 0;

/**
 * Connect to the backend `/admin` namespace (Admins + Call Center agents).
 * Exponential backoff with jitter so a reconnect storm does not hammer the API.
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
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
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
  mapSubs = 0;
}

export function subscribeRide(rideId: string) {
  socket?.emit('subscribe:ride', rideId);
}
export function unsubscribeRide(rideId: string) {
  socket?.emit('unsubscribe:ride', rideId);
}
export function subscribeDriver(driverId: string) {
  socket?.emit('subscribe:driver', driverId);
}
export function unsubscribeDriver(driverId: string) {
  socket?.emit('unsubscribe:driver', driverId);
}

export function subscribeMap() {
  const s = getSocket() ?? connectSocket();
  mapSubs += 1;
  if (mapSubs === 1) s.emit('subscribe:map');
}

export function unsubscribeMap() {
  mapSubs = Math.max(0, mapSubs - 1);
  if (mapSubs === 0) socket?.emit('unsubscribe:map');
}
