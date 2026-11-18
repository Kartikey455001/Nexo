import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CallsService } from './calls.service';
import type { StartCallRequest, CallResponse, IceServerResponse } from '@nexo/types';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get('ice-servers')
  @ApiOperation({ summary: 'Get WebRTC ICE server configurations' })
  getIceServers(): IceServerResponse[] {
    // In production, this would be dynamic and use TURN credentials.
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }

  @Get()
  @ApiOperation({ summary: 'Get call history' })
  async getCallHistory(@Request() req: any) {
    return this.callsService.getCallHistory(req.user.userId);
  }

  @Post()
  @Throttle({ global: { limit: 10, ttl: 60000 } }) // 10 calls per minute
  @ApiOperation({ summary: 'Start a new WebRTC call' })
  async startCall(@Request() req: any, @Body() body: StartCallRequest) {
    return this.callsService.startCall(req.user.userId, body.chatId);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'End an ongoing call' })
  async endCall(@Request() req: any, @Param('id') callId: string) {
    return this.callsService.endCall(req.user.userId, callId);
  }
}
