import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createStory(userId: string, mediaUrl: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    return this.prisma.story.create({
      data: {
        userId,
        mediaUrl,
        expiresAt,
      },
      include: {
        user: {
          select: { id: true, profile: true },
        },
      },
    });
  }

  async getActiveStories() {
    const now = new Date();
    
    return this.prisma.story.findMany({
      where: {
        expiresAt: {
          gt: now, // Greater than now means not expired
        },
      },
      include: {
        user: {
          select: { id: true, profile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
