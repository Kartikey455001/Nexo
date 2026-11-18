import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { PresenceGateway } from '../presence/presence.gateway';

@Injectable()
export class MessagesQueue {
  private readonly logger = new Logger(MessagesQueue.name);

  constructor(
    @Optional() @InjectQueue('messages') private readonly queue: Queue | undefined,
    private readonly prisma: PrismaService,
    private readonly presenceGateway: PresenceGateway,
  ) {}

  async queueDeletion(messageId: string, delayMs: number) {
    if (this.queue) {
      await this.queue.add(
      'delete_message',
      { messageId },
      { delay: delayMs, removeOnComplete: true }
      );
    } else {
      const timer = setTimeout(async () => {
        const message = await this.prisma.message.findUnique({ where: { id: messageId } });
        if (!message) return;
        await this.prisma.message.delete({ where: { id: messageId } });
        this.presenceGateway.server.to(`chat:${message.chatId}`).emit('message_deleted', { messageId });
      }, delayMs);
      timer.unref?.();
    }
    this.logger.debug(`Queued deletion for message ${messageId} in ${delayMs}ms`);
  }
}
