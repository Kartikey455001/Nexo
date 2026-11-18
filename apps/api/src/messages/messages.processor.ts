import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { PresenceGateway } from '../presence/presence.gateway';

@Processor('messages')
export class MessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly presenceGateway: PresenceGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'delete_message':
        await this.handleDeleteMessage(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleDeleteMessage(data: { messageId: string }) {
    const { messageId } = data;
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    
    if (message) {
      await this.prisma.message.delete({ where: { id: messageId } });
      this.logger.debug(`Deleted message ${messageId} due to TTL expiration`);

      // Notify clients to remove it from UI
      this.presenceGateway.server.to(`chat:${message.chatId}`).emit('message_deleted', { messageId });
    }
  }
}
