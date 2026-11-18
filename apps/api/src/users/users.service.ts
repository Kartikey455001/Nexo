import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service'; // refreshed
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async setPin(userId: string, pin: string) {
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(pin, saltRounds);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        createdAt: true,
        profile: true,
      },
    });
  }

  async searchUsers(query: string) {
    const trimmed = query.trim();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: trimmed, mode: 'insensitive' } },
          { profile: { username: { contains: trimmed, mode: 'insensitive' } } },
          { profile: { fullName: { contains: trimmed, mode: 'insensitive' } } },
          { profile: { businessName: { contains: trimmed, mode: 'insensitive' } } },
        ],
      },
      include: { profile: true },
      take: 20,
    });

    return users.map((user: any) => ({
      id: user.id,
      userId: user.id,
      username: user.profile?.username || '',
      fullName: user.profile?.fullName || null,
      avatarUrl: user.profile?.avatarUrl || null,
      accountType: user.accountType || 'PERSONAL',
      businessName: user.profile?.businessName || null,
      businessCategory: user.profile?.businessCategory || null,
      isFriend: false,
    }));
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.pinHash) {
      throw new BadRequestException('PIN not set for this user');
    }
    
    return bcrypt.compare(pin, user.pinHash);
  }
}
