import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

type DeviceMeta = {
  platform: string;
  deviceName: string;
  appVersion?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    fullName: string | undefined,
    device: DeviceMeta,
    businessData?: {
      accountType?: string;
      businessName?: string;
      businessCategory?: string;
      businessDescription?: string;
      businessHours?: string;
      businessAddress?: string;
      businessWebsite?: string;
      businessUpiId?: string;
    },
  ) {
    const normalizedEmail = this.normalizeEmail(email);
    this.assertBcryptPasswordSize(password);

    if (await this.prisma.user.findUnique({ where: { email: normalizedEmail } })) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            accountType: businessData?.accountType === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL',
            profile: {
              create: {
                username: `nexo_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
                fullName: fullName?.trim() || null,
                businessName: businessData?.businessName?.trim() || null,
                businessCategory: businessData?.businessCategory?.trim() || null,
                businessDescription: businessData?.businessDescription?.trim() || null,
                businessHours: businessData?.businessHours?.trim() || null,
                businessAddress: businessData?.businessAddress?.trim() || null,
                businessWebsite: businessData?.businessWebsite?.trim() || null,
                businessUpiId: businessData?.businessUpiId?.trim() || null,
              },
            },
          },
          include: { profile: true },
        });

        const session = await this.createDeviceSession(tx, user.id, device);
        return {
          success: true,
          isNewUser: true,
          user: this.publicUser(user),
          tokens: session.tokens,
          device: { id: session.deviceId },
        };
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string, device: DeviceMeta) {
    this.assertBcryptPasswordSize(password);
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      include: { profile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const session = await this.prisma.$transaction((tx) =>
      this.createDeviceSession(tx, user.id, device),
    );

    return {
      success: true,
      isNewUser: false,
      user: this.publicUser(user),
      tokens: session.tokens,
      device: { id: session.deviceId },
    };
  }

  async refresh(refreshToken: string) {
    const oldHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: oldHash },
    });

    if (!session || session.isRevoked || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const nextRefreshToken = randomBytes(48).toString('base64url');
    const nextHash = this.hashToken(nextRefreshToken);
    const rotated = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        refreshToken: oldHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        refreshToken: nextHash,
        expiresAt: this.refreshExpiry(),
      },
    });

    if (rotated.count !== 1) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    return {
      success: true,
      tokens: {
        accessToken: this.signAccessToken(session.userId, session.deviceId, session.id),
        refreshToken: nextRefreshToken,
        expiresIn: 604800,
      },
    };
  }

  async logout(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { success: true };
  }

  private async createDeviceSession(
    tx: Prisma.TransactionClient,
    userId: string,
    deviceMeta: DeviceMeta,
  ) {
    const device = await tx.device.create({
      data: {
        userId,
        platform: deviceMeta.platform,
        deviceName: deviceMeta.deviceName,
        appVersion: deviceMeta.appVersion,
      },
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const session = await tx.session.create({
      data: {
        userId,
        deviceId: device.id,
        refreshToken: this.hashToken(refreshToken),
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      deviceId: device.id,
      tokens: {
        accessToken: this.signAccessToken(userId, device.id, session.id),
        refreshToken,
        expiresIn: 604800,
      },
    };
  }

  private signAccessToken(userId: string, deviceId: string, sessionId: string) {
    return this.jwtService.sign({ userId, deviceId, sessionId });
  }

  private publicUser(user: User & { profile?: any | null }) {
    return {
      id: user.id,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      accountType: user.accountType || 'PERSONAL',
      username: user.profile?.username ?? null,
      fullName: user.profile?.fullName ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      businessName: user.profile?.businessName ?? null,
      businessCategory: user.profile?.businessCategory ?? null,
      businessDescription: user.profile?.businessDescription ?? null,
      businessHours: user.profile?.businessHours ?? null,
      businessAddress: user.profile?.businessAddress ?? null,
      businessWebsite: user.profile?.businessWebsite ?? null,
      businessUpiId: user.profile?.businessUpiId ?? null,
      paymentDetails: user.profile?.paymentDetails ?? null,
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiry() {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  private assertBcryptPasswordSize(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Password must be 72 bytes or fewer');
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
