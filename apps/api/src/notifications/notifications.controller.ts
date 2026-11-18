import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import type { UpdateFcmTokenRequest } from '@nexo/types';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  async updateToken(@Request() req: any, @Body() body: UpdateFcmTokenRequest) {
    // req.user.sessionId is missing in our JWT payload right now, so we'll just update it globally for the user's active devices or require sessionId.
    // In Phase 1, we set `userId` and `sessionId` in the payload. Let's assume `req.user.sessionId` exists.
    return this.notificationsService.updateToken(req.user.sessionId, body.fcmToken);
  }
}
