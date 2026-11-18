import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatsService } from './chats.service';
import type { CreateChatRequest } from '@nexo/types';

@ApiTags('Chats')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all chats for current user' })
  async getChats(@Request() req: any) {
    return this.chatsService.getUserChats(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat after verifying membership' })
  async getChat(@Request() req: any, @Param('id') chatId: string) {
    return this.chatsService.getChat(req.user.userId, chatId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new chat (1-on-1 or group)' })
  async createChat(@Request() req: any, @Body() body: CreateChatRequest) {
    if (!Array.isArray(body.memberIds)) {
      throw new BadRequestException('At least one other member is required');
    }
    body.memberIds = [...new Set([...body.memberIds, req.user.userId])];
    
    if (body.memberIds.length < 2) {
      throw new BadRequestException('A chat must have at least 2 members');
    }

    if (!body.isGroup && body.memberIds.length > 2) {
      throw new BadRequestException('A 1-on-1 chat can only have 2 members');
    }

    const existingMembers = await this.chatsService.countExistingUsers(body.memberIds);
    if (existingMembers !== body.memberIds.length) {
      throw new BadRequestException('One or more chat members could not be found');
    }

    return this.chatsService.createChat(req.user.userId, body);
  }

  @Post(':id/screenshot')
  @ApiOperation({ summary: 'Alert chat members that a screenshot was taken' })
  async alertScreenshot(@Request() req: any, @Param('id') chatId: string) {
    await this.chatsService.alertScreenshot(req.user.userId, chatId);
    return { success: true };
  }
}
