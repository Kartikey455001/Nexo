import { Controller, Get, Put, Query, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProfilesService } from './profiles.service';
import type { UpdateProfileRequest } from '@nexo/types';

@ApiTags('Profiles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMyProfile(@Request() req: any) {
    return this.profilesService.getProfileByUserId(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMyProfile(@Request() req: any, @Body() body: UpdateProfileRequest) {
    return this.profilesService.updateProfile(req.user.userId, body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search profiles by username or name' })
  async searchProfiles(@Request() req: any, @Query('q') query: string) {
    if (!query || query.length < 3) {
      return { profiles: [] };
    }
    return this.profilesService.searchProfiles(req.user.userId, query);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get profile by username' })
  async getProfileByUsername(@Request() req: any, @Param('username') username: string) {
    const profile = await this.profilesService.getProfileByUsername(req.user.userId, username);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }
}
