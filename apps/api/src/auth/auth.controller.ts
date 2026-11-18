import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthService } from './auth.service';

class DeviceDto {
  @IsIn(['web', 'android', 'ios'])
  platform!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}

class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fullName?: string;

  @IsOptional()
  @IsIn(['PERSONAL', 'BUSINESS'])
  accountType?: 'PERSONAL' | 'BUSINESS';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessWebsite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessUpiId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DeviceDto)
  device!: DeviceDto;
}

class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DeviceDto)
  device!: DeviceDto;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ global: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create an account with email and password' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password, body.fullName, body.device, {
      accountType: body.accountType,
      businessName: body.businessName,
      businessCategory: body.businessCategory,
      businessDescription: body.businessDescription,
      businessHours: body.businessHours,
      businessAddress: body.businessAddress,
      businessWebsite: body.businessWebsite,
      businessUpiId: body.businessUpiId,
    });
  }

  @Post('login')
  @Throttle({ global: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password, body.device);
  }

  @Post('refresh')
  @Throttle({ global: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new access token' })
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session' })
  logout(@Req() req: { user: { userId: string; sessionId: string } }) {
    return this.authService.logout(req.user.userId, req.user.sessionId);
  }
}
