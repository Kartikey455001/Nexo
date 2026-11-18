import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UploadKeysRequest } from '@nexo/types';

@Injectable()
export class E2eService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadKeys(userId: string, data: UploadKeysRequest) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        identityKeyPublic: data.identityKeyPublic,
        encryptedIdentityKeyBackup: data.encryptedIdentityKeyBackup,
        identityKeyBackupSalt: data.identityKeyBackupSalt,
        identityKeyBackupIv: data.identityKeyBackupIv,
      },
    });

    if (data.preKeys.length > 0) {
      await this.prisma.preKey.createMany({
        data: data.preKeys.map((key) => ({
          userId,
          keyId: key.keyId,
          publicKey: key.publicKey,
        })),
      });
    }

    return { success: true };
  }

  async getOwnKeys(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        identityKeyPublic: true,
        encryptedIdentityKeyBackup: true,
        identityKeyBackupSalt: true,
        identityKeyBackupIv: true,
      },
    });
  }

  async fetchKeys(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { identityKeyPublic: true },
    });

    if (!user?.identityKeyPublic) return null;

    return {
      identityKeyPublic: user.identityKeyPublic,
      preKey: null as any,
    };
  }
}
