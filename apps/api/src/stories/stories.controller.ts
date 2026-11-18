import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoriesService } from './stories.service';
import type { CreateStoryRequest } from '@nexo/types';

@ApiTags('Stories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active stories' })
  async getActiveStories(@Request() req: any) {
    // For now, gets all active stories (could filter by friends in Phase 9)
    return this.storiesService.getActiveStories();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new story (expires in 24h)' })
  async createStory(@Request() req: any, @Body() body: CreateStoryRequest) {
    return this.storiesService.createStory(req.user.userId, body.mediaUrl);
  }
}
