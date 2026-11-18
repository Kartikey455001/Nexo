import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChatRequest } from '@nexo/types';
import { PresenceGateway } from '../presence/presence.gateway';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presenceGateway: PresenceGateway,
  ) {}

  countExistingUsers(userIds: string[]) {
    return this.prisma.user.count({ where: { id: { in: userIds } } });
  }

  async getUserChats(userId: string) {
    return this.prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, profile: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getChat(userId: string, chatId: string) {
    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: { select: { id: true, profile: true } },
          },
        },
      },
    });
  }

  async createChat(creatorId: string, data: CreateChatRequest) {
    // Check for blocks if it's a 1-on-1
    if (!data.isGroup) {
      const otherUserId = data.memberIds.find(id => id !== creatorId);
      if (otherUserId) {
        const block = await this.prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: creatorId, blockedId: otherUserId },
              { blockerId: otherUserId, blockedId: creatorId },
            ],
          },
        });
        if (block) {
          throw new ForbiddenException('Cannot create chat due to block restrictions');
        }
        
        // check if 1-1 already exists
        const existingChat = await this.prisma.chat.findFirst({
          where: {
            isGroup: false,
            AND: [
              { members: { some: { userId: creatorId } } },
              { members: { some: { userId: otherUserId } } }
            ]
          },
          include: { members: { include: { user: { select: { id: true, profile: true } } } } }
        });

        if (existingChat) return existingChat;
      }
    }

    const chat = await this.prisma.chat.create({
      data: {
        isGroup: data.isGroup,
        name: data.name,
        members: {
          create: data.memberIds.map(userId => ({ userId })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, profile: true },
            },
          },
        },
      },
    });

    return chat;
  }

  async alertScreenshot(userId: string, chatId: string) {
    const isMember = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } }
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { username: true } } },
    });

    this.presenceGateway.server.to(`chat:${chatId}`).emit('screenshot_taken', {
      chatId,
      userId,
      username: user?.profile?.username || 'A user',
      timestamp: new Date().toISOString(),
    });
  }
}
