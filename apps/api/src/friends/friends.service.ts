import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriends(userId: string) {
    // Friends are either friendships where user is requester OR addressee and status is ACCEPTED
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'ACCEPTED' },
          { addresseeId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        requester: { select: { id: true, profile: true } },
        addressee: { select: { id: true, profile: true } },
      },
    });

    return friendships.map((f: any) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      return {
        friendshipId: f.id,
        user: friend,
      };
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, profile: true } },
      },
    });
  }

  async sendRequest(requesterId: string, addresseeId: string) {
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Friendship or request already exists');
    }

    return this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
    });
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!request || request.addresseeId !== userId || request.status !== 'PENDING') {
      throw new NotFoundException('Pending request not found');
    }

    return this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
  }

  async removeFriend(userId: string, id: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id } });
    if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
      throw new NotFoundException('Friendship not found');
    }

    return this.prisma.friendship.delete({ where: { id } });
  }

  async syncContacts(userId: string, phoneHashes: string[]) {
    if (!phoneHashes || phoneHashes.length === 0) return [];

    // Find all users whose phoneHash matches one of the provided hashes
    const matches = await this.prisma.user.findMany({
      where: {
        phoneHash: { in: phoneHashes },
        id: { not: userId }, // Exclude self
      },
      select: { id: true, profile: true },
    });

    // Check which ones are already friends
    const existingFriendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: { in: matches.map((m: any) => m.id) } },
          { requesterId: { in: matches.map((m: any) => m.id) }, addresseeId: userId },
        ],
      },
    });

    return matches.map((user: any) => {
      const friendship = existingFriendships.find((f: any) => 
        (f.requesterId === user.id && f.addresseeId === userId) ||
        (f.requesterId === userId && f.addresseeId === user.id)
      );

      return {
        id: user.id,
        username: user.profile?.username || '',
        displayName: user.profile?.fullName || null,
        avatarUrl: user.profile?.avatarUrl || null,
        isFriend: friendship?.status === 'ACCEPTED',
        friendshipStatus: friendship?.status || null,
      };
    });
  }
}
