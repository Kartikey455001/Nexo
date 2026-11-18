import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCallHistory(userId: string) {
    return this.prisma.call.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async startCall(initiatorId: string, chatId: string) {
    // Verify membership
    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: initiatorId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this chat');
    }

    // Get all members to add them as participants initially
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const call = await this.prisma.call.create({
      data: {
        chatId,
        initiatorId,
        status: 'ONGOING',
        participants: {
          create: chat.members.map((m) => ({
            userId: m.userId,
            joinedAt: m.userId === initiatorId ? new Date() : undefined, // others haven't joined yet
          })),
        },
      },
      include: { participants: true },
    });

    return call;
  }

  async endCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true },
    });

    if (!call) throw new NotFoundException('Call not found');

    const isParticipant = call.participants.some(p => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Not a participant');

    return this.prisma.call.update({
      where: { id: callId },
      data: {
        status: 'COMPLETED', // naive status for now
        endedAt: new Date(),
      },
    });
  }
}
