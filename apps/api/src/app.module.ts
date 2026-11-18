import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrivacyModule } from './privacy/privacy.module';
import { BlocksModule } from './blocks/blocks.module';
import { PresenceModule } from './presence/presence.module';
import { ChatsModule } from './chats/chats.module';
import { MessagesModule } from './messages/messages.module';
import { MediaModule } from './media/media.module';
import { StoriesModule } from './stories/stories.module';
import { E2eModule } from './e2e/e2e.module';
import { CallsModule } from './calls/calls.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FriendsModule } from './friends/friends.module';
import { AiModule } from './ai/ai.module';
import { BusinessModule } from './business/business.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    DatabaseModule,
    ...(process.env.REDIS_ENABLED === 'true'
      ? [BullModule.forRoot({
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
        })]
      : []),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const redisStorage = process.env.REDIS_ENABLED === 'true'
          ? new ThrottlerStorageRedisService({
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            })
          : undefined;

        return {
          throttlers: [{ name: 'global', limit: 100, ttl: 60000 }],
          ...(redisStorage ? { storage: redisStorage } : {}),
        };
      },
    }),
    HealthModule, AuthModule, SessionsModule, UsersModule, ProfilesModule, PrivacyModule, BlocksModule, PresenceModule, ChatsModule, MessagesModule, MediaModule, StoriesModule, E2eModule, CallsModule, NotificationsModule, FriendsModule, AiModule, BusinessModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
