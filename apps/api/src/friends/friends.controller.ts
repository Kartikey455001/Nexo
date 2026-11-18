import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FriendsService } from './friends.service';
import type { SyncContactsRequest } from '@nexo/types';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'List accepted friends' })
  async getFriends(@Request() req: any) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'List pending incoming friend requests' })
  async getPendingRequests(@Request() req: any) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }

  @Post('request/:userId')
  @ApiOperation({ summary: 'Send a friend request' })
  async sendRequest(@Request() req: any, @Param('userId') targetUserId: string) {
    if (req.user.userId === targetUserId) throw new BadRequestException('Cannot add yourself');
    return this.friendsService.sendRequest(req.user.userId, targetUserId);
  }

  @Post('accept/:id')
  @ApiOperation({ summary: 'Accept a friend request' })
  async acceptRequest(@Request() req: any, @Param('id') requestId: string) {
    return this.friendsService.acceptRequest(req.user.userId, requestId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a friend or reject a request' })
  async removeFriend(@Request() req: any, @Param('id') id: string) {
    return this.friendsService.removeFriend(req.user.userId, id);
  }

  @Post('sync-contacts')
  @ApiOperation({ summary: 'Sync contacts via phone number hashes' })
  async syncContacts(@Request() req: any, @Body() body: SyncContactsRequest) {
    return this.friendsService.syncContacts(req.user.userId, body.phoneHashes);
  }
}
