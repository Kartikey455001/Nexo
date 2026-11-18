import { Test, TestingModule } from '@nestjs/testing';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

describe('PresenceGateway', () => {
  let gateway: PresenceGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceGateway,
        { provide: PresenceService, useValue: { markUserOnline: jest.fn(), markUserOffline: jest.fn() } },
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: PrismaService, useValue: { chatMember: { findMany: jest.fn().mockResolvedValue([]) } } },
      ],
    }).compile();

    gateway = module.get<PresenceGateway>(PresenceGateway);
    gateway.server = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
  });

  it('should relay webrtc signal to target user room', () => {
    const mockClient = { data: { userId: 'user-a' } } as any;
    const data = { targetUserId: 'user-b', signal: { type: 'offer', sdp: '...' } };

    gateway.handleWebRTCSignal(data, mockClient);

    expect(gateway.server.to).toHaveBeenCalledWith('user:user-b');
    expect(gateway.server.emit).toHaveBeenCalledWith('webrtc_signal', {
      fromUserId: 'user-a',
      signal: data.signal,
    });
  });
});
