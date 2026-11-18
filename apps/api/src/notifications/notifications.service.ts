import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('Push notifications are currently mocked.');
  }

  async updateToken(sessionId: string, fcmToken: string) {
    if (!sessionId) {
      this.logger.warn('No sessionId provided in token update');
      return { success: false };
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { fcmToken },
    });
    return { success: true };
  }

  async sendPushNotification(userId: string, payload: any) {
    // 1. Fetch all active tokens for this user
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        fcmToken: { not: null },
        expiresAt: { gt: new Date() },
      },
      select: { fcmToken: true },
    });

    const tokens = sessions.map((s: any) => s.fcmToken).filter(Boolean) as string[];

    if (tokens.length === 0) {
      this.logger.debug(`No active push tokens found for user ${userId}`);
      return;
    }

    // 2. Mock Dispatch
    this.logger.debug(`[MOCK PUSH] Would have sent to ${tokens.length} devices: ${JSON.stringify(payload)}`);
  }
}
