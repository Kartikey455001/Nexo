import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrivacyService } from './privacy.service';
import type { UpdatePrivacySettingsRequest } from '@nexo/types';

@ApiTags('Privacy')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user privacy settings' })
  async getPrivacySettings(@Request() req: any) {
    return this.privacyService.getPrivacySettings(req.user.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user privacy settings' })
  async updatePrivacySettings(@Request() req: any, @Body() body: UpdatePrivacySettingsRequest) {
    return this.privacyService.updatePrivacySettings(req.user.userId, body);
  }
}
