import { io } from 'socket.io-client';
import { getBaseUrl } from '../utils/api';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    let socketUrl = getBaseUrl().replace(/\/api\/?$/, '');
    if (!socketUrl || socketUrl.startsWith('file:') || socketUrl === '') {
      socketUrl = 'https://arisoretail.duckdns.org';
    }
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ [SocketClient] Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 [SocketClient] Disconnected from server');
    });
  }
  return socket;
};
