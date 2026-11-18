import { Controller, Get, Post, Param, Delete, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  async getSessions(@Request() req: any) {
    return this.sessionsService.getUserSessions(req.user.userId);
  }

  @Delete(':deviceId')
  @ApiOperation({ summary: 'Revoke a specific device session' })
  async revokeSession(@Request() req: any, @Param('deviceId') deviceId: string) {
    if (req.user.deviceId === deviceId) {
      // Typically, you'd use a different endpoint for logout or handle it gracefully
      // But for now, we just proceed
    }
    return this.sessionsService.revokeSession(req.user.userId, deviceId);
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke all other sessions (logout from other devices)' })
  async revokeAllOtherSessions(@Request() req: any) {
    return this.sessionsService.revokeAllExcept(req.user.userId, req.user.deviceId);
  }
}
