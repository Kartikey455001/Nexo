import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma.service';
import { PresenceGateway } from '../presence/presence.gateway';
import { NotificationsQueue } from '../notifications/notifications.queue';
import { MessagesQueue } from './messages.queue';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;
  let presenceGateway: PresenceGateway;
  let notificationsQueue: NotificationsQueue;
  let messagesQueue: MessagesQueue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: {
            chatMember: { findUnique: jest.fn() },
            message: { findMany: jest.fn(), create: jest.fn() },
            chat: { findUnique: jest.fn() },
          },
        },
        {
          provide: PresenceGateway,
          useValue: {
            server: {
              to: jest.fn().mockReturnThis(),
              emit: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsQueue,
          useValue: {
            queueMessagePush: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: MessagesQueue,
          useValue: {
            queueDeletion: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService);
    presenceGateway = module.get<PresenceGateway>(PresenceGateway);
    notificationsQueue = module.get<NotificationsQueue>(NotificationsQueue);
    messagesQueue = module.get<MessagesQueue>(MessagesQueue);
  });

  it('should verify membership', async () => {
    (prisma.chatMember.findUnique as jest.Mock).mockResolvedValue({ id: 'mem1' });
    const result = await service.isMemberOfChat('user1', 'chat1');
    expect(result).toBe(true);
  });

  it('should send a message and broadcast/notify members', async () => {
    const mockMessage = { id: 'msg1', content: 'hello', isEncrypted: false, expiresAt: null };
    (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);
    (prisma.chat.findUnique as jest.Mock).mockResolvedValue({
      id: 'chat1',
      members: [{ userId: 'user1' }, { userId: 'user2' }],
    });

    await service.sendMessage('user1', 'chat1', 'hello');

    expect(prisma.message.create).toHaveBeenCalled();
    expect(presenceGateway.server.to).toHaveBeenCalledWith('chat:chat1');
    expect(presenceGateway.server.emit).toHaveBeenCalledWith('new_message', mockMessage);
    expect(notificationsQueue.queueMessagePush).toHaveBeenCalledWith('user2', 'msg1', 'chat1', false);
  });

  it('should queue deletion job when message has ttl', async () => {
    const mockMessage = { id: 'msg1', content: 'self-destruct', expiresAt: new Date() };
    (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);
    (prisma.chat.findUnique as jest.Mock).mockResolvedValue(null); // No notifications triggered for simplicity

    await service.sendMessage('user1', 'chat1', 'self-destruct', undefined, false, 60);

    expect(prisma.message.create).toHaveBeenCalled();
    expect(messagesQueue.queueDeletion).toHaveBeenCalledWith('msg1', 60000);
  });
});
