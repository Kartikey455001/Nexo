import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateProfileRequest } from '@nexo/types';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, email: true },
    });
    return {
      ...profile,
      accountType: user?.accountType || 'PERSONAL',
    };
  }

  async updateProfile(userId: string, data: UpdateProfileRequest) {
    const { accountType, ...profileData } = data as any;
    if (accountType) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { accountType },
      });
    }
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: profileData,
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, email: true },
    });
    return {
      ...updated,
      accountType: user?.accountType || 'PERSONAL',
    };
  }

  async getProfileByUsername(requesterId: string, username: string) {
    // Check if blocked
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: {
        user: {
          select: {
            blocksReceived: {
              where: { blockerId: requesterId },
            },
            blocksInitiated: {
              where: { blockedId: requesterId },
            }
          }
        }
      }
    });

    if (!profile) return null;

    const isBlockedByRequester = profile.user.blocksReceived.length > 0;
    const isBlockingRequester = profile.user.blocksInitiated.length > 0;

    if (isBlockedByRequester || isBlockingRequester) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user, ...profileData } = profile;
    return profileData;
  }

  async searchProfiles(requesterId: string, query: string) {
    const profiles = await this.prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
        ],
        user: {
          // Do not include users who blocked the requester or are blocked by the requester
          blocksReceived: { none: { blockerId: requesterId } },
          blocksInitiated: { none: { blockedId: requesterId } },
        }
      },
      take: 20,
    });

    return { profiles };
  }
}
