import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isRevoked: false },
      include: {
        device: {
          select: { id: true, platform: true, deviceName: true, lastActiveAt: true },
        },
      },
    });
  }

  async revokeSession(userId: string, deviceId: string) {
    const session = await this.prisma.session.findFirst({
      where: { userId, deviceId, isRevoked: false },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already revoked');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    return { success: true };
  }

  async revokeAllExcept(userId: string, currentDeviceId: string) {
    await this.prisma.session.updateMany({
      where: { 
        userId, 
        deviceId: { not: currentDeviceId },
        isRevoked: false
      },
      data: { isRevoked: true },
    });
    return { success: true };
  }
}
