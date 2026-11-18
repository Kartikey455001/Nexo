import { Injectable, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsQueue {
  constructor(@Optional() @InjectQueue('notifications') private readonly notificationsQueue?: Queue) {}

  async queueMessagePush(targetUserId: string, messageId: string, chatId: string, isEncrypted: boolean) {
    if (!this.notificationsQueue) return;
    await this.notificationsQueue.add(
      'push_message',
      {
        targetUserId,
        payload: {
          type: 'new_message',
          messageId,
          chatId,
          isEncrypted: String(isEncrypted), // FCM data payloads must be string records
        },
      },
      {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      }
    );
  }
}
