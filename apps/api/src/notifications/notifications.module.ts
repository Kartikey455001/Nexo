import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsQueue } from './notifications.queue';

const redisEnabled = process.env.REDIS_ENABLED === 'true';

@Module({
  imports: [
    ...(redisEnabled ? [BullModule.registerQueue({ name: 'notifications' })] : []),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ...(redisEnabled ? [NotificationsProcessor] : []), NotificationsQueue],
  exports: [NotificationsQueue], // Export queue so MessagesModule can use it
})
export class NotificationsModule {}
