import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PresenceGateway } from '../presence/presence.gateway';
import { NotificationsQueue } from '../notifications/notifications.queue';
import { MessagesQueue } from './messages.queue';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presenceGateway: PresenceGateway,
    private readonly notificationsQueue: NotificationsQueue,
    private readonly messagesQueue: MessagesQueue,
  ) {}

  async isMemberOfChat(userId: string, chatId: string): Promise<boolean> {
    const membership = await this.prisma.chatMember.findUnique({
      where: {
        chatId_userId: { chatId, userId }
      }
    });
    return !!membership;
  }

  async getMessages(chatId: string) {
    const now = new Date();
    await this.prisma.message.deleteMany({
      where: {
        chatId,
        expiresAt: { not: null, lt: now },
      },
    });
    return this.prisma.message.findMany({
      where: {
        chatId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(senderId: string, chatId: string, content?: string, attachmentUrl?: string, isEncrypted: boolean = false, ttl?: number) {
    let expiresAt = null;
    if (ttl && ttl > 0) {
      expiresAt = new Date(Date.now() + ttl * 1000);
    }

    const message = await this.prisma.message.create({
      data: {
        senderId,
        chatId,
        content,
        attachmentUrl,
        isEncrypted,
        expiresAt,
      },
    });

    if (ttl && ttl > 0) {
      await this.messagesQueue.queueDeletion(message.id, ttl * 1000);
    }

    // Broadcast to the chat room
    this.presenceGateway.server.to(`chat:${chatId}`).emit('new_message', message);

    // Queue push notifications and emit directly to member user rooms
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (chat) {
      for (const member of chat.members) {
        // Also emit to user's personal socket room so newly created chats or unjoined sockets get it
        this.presenceGateway.server.to(`user:${member.userId}`).emit('new_message', message);

        if (member.userId !== senderId) {
          await this.notificationsQueue.queueMessagePush(
            member.userId,
            message.id,
            chatId,
            message.isEncrypted
          );
        }
      }
    }

    return message;
  }
}
