import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Redis from 'ioredis';

@Injectable()
export class PresenceService {
  private readonly redisClient: Redis | null;
  private readonly localSockets = new Map<string, Set<string>>();
  private readonly localSocketUsers = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {
    this.redisClient = process.env.REDIS_ENABLED === 'true'
      ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
      : null;
  }

  async markUserOnline(userId: string, socketId: string) {
    if (!this.redisClient) {
      const sockets = this.localSockets.get(userId) ?? new Set<string>();
      sockets.add(socketId);
      this.localSockets.set(userId, sockets);
      this.localSocketUsers.set(socketId, userId);
      return;
    }
    // Store mapping of socket -> user, and user -> socket (could have multiple devices, so ideally a set)
    await this.redisClient.sadd(`user:${userId}:sockets`, socketId);
    await this.redisClient.set(`socket:${socketId}:user`, userId);
    
    // Set user as online
    await this.redisClient.set(`user:${userId}:status`, 'online');
  }

  async markUserOffline(socketId: string) {
    if (!this.redisClient) {
      const userId = this.localSocketUsers.get(socketId);
      if (!userId) return;
      this.localSocketUsers.delete(socketId);
      const sockets = this.localSockets.get(userId);
      sockets?.delete(socketId);
      if (sockets?.size) return;
      this.localSockets.delete(userId);
      await this.prisma.user.updateMany({ where: { id: userId }, data: { lastSeenAt: new Date() } });
      return;
    }
    const userId = await this.redisClient.get(`socket:${socketId}:user`);
    if (!userId) return;

    await this.redisClient.srem(`user:${userId}:sockets`, socketId);
    await this.redisClient.del(`socket:${socketId}:user`);

    const remainingSockets = await this.redisClient.scard(`user:${userId}:sockets`);
    if (remainingSockets === 0) {
      await this.redisClient.set(`user:${userId}:status`, 'offline');
      
      // Update lastSeenAt in DB
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.redisClient) return (this.localSockets.get(userId)?.size ?? 0) > 0;
    const status = await this.redisClient.get(`user:${userId}:status`);
    return status === 'online';
  }
}
