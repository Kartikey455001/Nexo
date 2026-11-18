import { Controller, Get, Post, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { E2eService } from './e2e.service';
import type { UploadKeysRequest } from '@nexo/types';
import { FetchKeysResponse } from '@nexo/types';

@ApiTags('E2E')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('e2e/keys')
export class E2eController {
  constructor(private readonly e2eService: E2eService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an identity key and encrypted private-key backup' })
  async uploadKeys(@Request() req: any, @Body() body: UploadKeysRequest) {
    return this.e2eService.uploadKeys(req.user.userId, body);
  }

  @Get('me')
  @ApiOperation({ summary: 'Fetch the signed-in account public key and encrypted key backup' })
  async getOwnKeys(@Request() req: any) {
    return this.e2eService.getOwnKeys(req.user.userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Fetch another account’s public identity key' })
  async fetchKeys(@Param('userId') targetUserId: string): Promise<FetchKeysResponse> {
    const keys = await this.e2eService.fetchKeys(targetUserId);
    if (!keys) {
      throw new NotFoundException('Key bundle not found for user');
    }
    return keys;
  }
}
