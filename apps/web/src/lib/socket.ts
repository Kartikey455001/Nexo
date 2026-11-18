import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nexo_token') : null;
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const cleanUrl = rawApiUrl.replace(/\/$/, '');

  if (!socket) {
    // NestJS PresenceGateway is mounted on '/presence' namespace
    socket = io(`${cleanUrl}/presence`, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: token,
      },
    });
  } else if (token && socket.auth && typeof socket.auth === 'object') {
    (socket.auth as any).token = token;
  }

  if (socket && !socket.connected && typeof window !== 'undefined' && token) {
    socket.connect();
  }

  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  const token = typeof window !== 'undefined' ? localStorage.getItem('nexo_token') : null;
  if (s.auth && typeof s.auth === 'object') {
    (s.auth as any).token = token;
  }

  if (!s.connected && token) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
