import { Controller, Get, Post, Body, Param, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { MessagesService } from './messages.service';
import type { SendMessageRequest } from '@nexo/types';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get messages for a chat' })
  async getMessages(@Request() req: any, @Param('chatId') chatId: string) {
    const isMember = await this.messagesService.isMemberOfChat(req.user.userId, chatId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }
    return this.messagesService.getMessages(chatId);
  }

  @Post()
  @Throttle({ global: { limit: 30, ttl: 60000 } }) // 30 messages per minute
  @ApiOperation({ summary: 'Send a message to a chat' })
  async sendMessage(@Request() req: any, @Param('chatId') chatId: string, @Body() body: SendMessageRequest) {
    const isMember = await this.messagesService.isMemberOfChat(req.user.userId, chatId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }
    
    if (!body.content || body.content.length > 1_000_000) {
      throw new BadRequestException('A message payload is required.');
    }

    let isEncrypted = Boolean(body.isEncrypted);
    if (isEncrypted) {
      try {
        const envelope = JSON.parse(body.content);
        const ownCopy = envelope?.recipients?.[req.user.userId];
        if (
          envelope?.version !== 1 ||
          envelope?.senderId !== req.user.userId ||
          !ownCopy ||
          typeof ownCopy.cipherText !== 'string' ||
          typeof ownCopy.iv !== 'string' ||
          (!body.attachmentUrl && !ownCopy.cipherText)
        ) {
          isEncrypted = false;
        }
      } catch {
        isEncrypted = false;
      }
    }

    return this.messagesService.sendMessage(req.user.userId, chatId, body.content, body.attachmentUrl, isEncrypted, body.ttl);
  }
}
