import { Test, TestingModule } from '@nestjs/testing';
import { E2eService } from './e2e.service';
import { PrismaService } from '../prisma.service';

describe('E2eService', () => {
  let service: E2eService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2eService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (cb) => {
              // Mock the transaction client
              const tx = {
                user: {
                  update: jest.fn(),
                  findUnique: jest.fn().mockResolvedValue({ identityKeyPublic: 'id-key-1' }),
                },
                preKey: {
                  createMany: jest.fn(),
                  findFirst: jest.fn().mockResolvedValue({ id: 'pk1', keyId: 1, publicKey: 'pre-key-1' }),
                  delete: jest.fn(),
                },
              };
              return cb(tx);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<E2eService>(E2eService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should upload keys', async () => {
    const req = {
      identityKeyPublic: 'id-key-1',
      preKeys: [{ keyId: 1, publicKey: 'pre-key-1' }],
    };
    const res = await service.uploadKeys('user1', req);
    expect(res.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should fetch keys and consume a prekey', async () => {
    const res = await service.fetchKeys('target1');
    expect(res).toBeDefined();
    if (res) {
      expect(res.identityKeyPublic).toBe('id-key-1');
      expect(res.preKey?.publicKey).toBe('pre-key-1');
    }
  });
});
