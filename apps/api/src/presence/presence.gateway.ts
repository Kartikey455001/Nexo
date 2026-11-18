import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@WebSocketGateway({
  namespace: '/presence',
  cors: { origin: '*' },
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;
      
      // Store on client for later use in handlers
      client.data.userId = userId;

      await this.presenceService.markUserOnline(userId, client.id);
      
      // Join all chat rooms for this user
      const userChats = await this.prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      userChats.forEach(chat => {
        client.join(`chat:${chat.chatId}`);
      });
      
      // Join a personal room for direct signaling (e.g., WebRTC offers)
      client.join(`user:${userId}`);
      
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    await this.presenceService.markUserOffline(client.id);
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @MessageBody() data: { chatId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.chatId) {
      client.join(`chat:${data.chatId}`);
    }
    return { event: 'joined_chat', chatId: data?.chatId };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId?: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.chatId) {
      client.to(`chat:${data.chatId}`).emit('typing', {
        chatId: data.chatId,
        userId: client.data.userId,
        isTyping: data.isTyping,
      });
    }
    return { event: 'typing_ack', data };
  }

  @SubscribeMessage('webrtc_signal')
  handleWebRTCSignal(
    @MessageBody()
    data: {
      targetUserId: string;
      signal: any;
      callType?: 'audio' | 'video';
      chatId?: string;
      callerInfo?: {
        username?: string;
        fullName?: string;
        avatarUrl?: string;
      };
      callId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Route the WebRTC payload to the target user's personal room
    this.server.to(`user:${data.targetUserId}`).emit('webrtc_signal', {
      fromUserId: client.data.userId,
      signal: data.signal,
      callType: data.callType,
      chatId: data.chatId,
      callerInfo: data.callerInfo,
      callId: data.callId,
    });
  }
}
