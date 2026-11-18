import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdatePrivacySettingsRequest } from '@nexo/types';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPrivacySettings(userId: string) {
    let settings = await this.prisma.privacySetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.privacySetting.create({
        data: { userId },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, userId: uId, ...rest } = settings;
    return rest;
  }

  async updatePrivacySettings(userId: string, data: UpdatePrivacySettingsRequest) {
    const settings = await this.prisma.privacySetting.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, userId: uId, ...rest } = settings;
    return rest;
  }
}
