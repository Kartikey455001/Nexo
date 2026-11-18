import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { userId?: string; deviceId?: string; sessionId?: string }) {
    if (!payload.userId || !payload.deviceId || !payload.sessionId) {
      throw new UnauthorizedException('Invalid access token');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.userId,
        deviceId: payload.deviceId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session has expired or was revoked');
    }

    return {
      userId: payload.userId,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
    };
  }
}
