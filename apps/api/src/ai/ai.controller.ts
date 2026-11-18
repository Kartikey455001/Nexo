import { Controller, Post, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chats/:chatId/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertMembership(userId: string, chatId: string) {
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this chat');
  }

  private async getRecentMessages(chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { sender: { select: { profile: { select: { username: true } } } } },
    });

    return messages.reverse().map((m: any) => ({
      sender: m.sender?.profile?.username || 'User',
      content: m.content || '',
    }));
  }

  @Post('smart-replies')
  @ApiOperation({ summary: 'Generate AI smart reply suggestions for a chat' })
  async getSmartReplies(@Request() req: any, @Param('chatId') chatId: string) {
    await this.assertMembership(req.user.userId, chatId);
    const messages = await this.getRecentMessages(chatId);
    const suggestions = await this.aiService.generateSmartReplies(messages);
    return { suggestions };
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Generate an AI summary of the chat history' })
  async summarizeChat(@Request() req: any, @Param('chatId') chatId: string) {
    await this.assertMembership(req.user.userId, chatId);
    const messages = await this.getRecentMessages(chatId);
    const summary = await this.aiService.summarizeChat(messages);
    return { summary };
  }
}
