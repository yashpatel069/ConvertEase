import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer, clientUrl: string): Server => {
  io = new Server(server, {
    cors: {
      origin: clientUrl || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join room for specific file conversions or user-specific channel
    socket.on('join', (room: string) => {
      socket.join(room);
      console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

/**
 * Dispatch real-time progress events to a Socket.IO room (e.g. file ID or user ID)
 */
export const emitProgress = (roomName: string, eventData: {
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  error?: string;
  fileId?: string;
  downloadUrl?: string;
}): void => {
  if (!io) return;
  io.to(roomName).emit('conversion_progress', eventData);
};
