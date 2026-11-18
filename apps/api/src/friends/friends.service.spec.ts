import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma.service';

describe('FriendsService', () => {
  let service: FriendsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn().mockResolvedValue([
                { id: 'user-2', phoneHash: 'hash2', profile: { username: 'test2' } }
              ]),
            },
            friendship: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should sync contacts', async () => {
    const result = await service.syncContacts('user-1', ['hash1', 'hash2']);
    
    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(prisma.friendship.findMany).toHaveBeenCalled();
    expect(result.length).toBe(1);
    expect(result[0].username).toBe('test2');
    expect(result[0].isFriend).toBe(false);
  });
});
