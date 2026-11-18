import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PresenceModule } from '../presence/presence.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';
import { MessagesQueue } from './messages.queue';
import { MessagesProcessor } from './messages.processor';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

@Module({
  imports: [
    PresenceModule,
    NotificationsModule,
    ...(redisEnabled ? [BullModule.registerQueue({ name: 'messages' })] : []),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesQueue, ...(redisEnabled ? [MessagesProcessor] : [])],
})
export class MessagesModule {}
