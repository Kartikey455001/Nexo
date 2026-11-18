import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '../prisma.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: PrismaService,
          useValue: {
            profile: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return null if user is blocked when fetching profile by username', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
      id: 'profile1',
      userId: 'user1',
      username: 'johndoe',
      user: {
        blocksReceived: [{ blockerId: 'requester' }], // blocked by requester
        blocksInitiated: [],
      }
    });

    const result = await service.getProfileByUsername('requester', 'johndoe');
    expect(result).toBeNull();
  });

  it('should exclude blocked users from search results', async () => {
    (prisma.profile.findMany as jest.Mock).mockResolvedValue([
      { id: 'profile2', username: 'janedoe' }
    ]);

    const result = await service.searchProfiles('requester', 'jane');
    expect(prisma.profile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        user: {
          blocksReceived: { none: { blockerId: 'requester' } },
          blocksInitiated: { none: { blockedId: 'requester' } },
        }
      })
    }));
    expect(result.profiles).toHaveLength(1);
  });
});
