import { Controller, Get, Post, Query, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

class SetPinDto {
  pin!: string;
}

class VerifyPinDto {
  pin!: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by username' })
  async searchUsers(@Query('query') query: string) {
    if (!query || query.length < 3) return [];
    return this.usersService.searchUsers(query);
  }

  @Post('pin')
  @ApiOperation({ summary: 'Set or change the user 6-digit PIN' })
  async setPin(@Request() req: any, @Body() body: SetPinDto) {
    if (!/^\d{6}$/.test(body.pin)) {
      throw new BadRequestException('PIN must be exactly 6 digits');
    }
    await this.usersService.setPin(req.user.userId, body.pin);
    return { success: true };
  }

  @Post('verify-pin')
  @ApiOperation({ summary: 'Verify the user 6-digit PIN' })
  async verifyPin(@Request() req: any, @Body() body: VerifyPinDto) {
    const isValid = await this.usersService.verifyPin(req.user.userId, body.pin);
    return { success: isValid };
  }
}
