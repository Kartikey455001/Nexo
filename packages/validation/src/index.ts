import { z } from 'zod';

export const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be a valid E.164 international format (e.g., +1234567890)');

export const EmailSchema = z.string().email('Enter a valid email address').max(254);

export const PasswordSchema = z.string().min(12, 'Password must be at least 12 characters').max(72);

export const PinSchema = z
  .string()
  .regex(/^\d{6}$/, 'Security PIN must be exactly 6 numeric digits');

export const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores');

export const ProfileUpdateSchema = z.object({
  username: UsernameSchema.optional(),
  fullName: z.string().max(60, 'Full name cannot exceed 60 characters').optional(),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional(),
});

export const PrivacySettingsSchema = z.object({
  lastSeen: z.enum(['EVERYONE', 'CONTACTS', 'NOBODY']),
  profilePhotoVisibility: z.enum(['EVERYONE', 'CONTACTS', 'NOBODY']),
  readReceipts: z.boolean(),
});

export const MessageCreateSchema = z.object({
  content: z.string().max(10000, 'Message cannot exceed 10000 characters').optional(),
  attachmentUrl: z.string().url().optional(),
  isEncrypted: z.boolean().default(false),
  ttl: z.number().int().nonnegative().optional(),
});

export const CreateChatSchema = z.object({
  isGroup: z.boolean().default(false),
  name: z.string().min(1).max(50).optional(),
  memberIds: z.array(z.string().uuid()).min(1, 'Chat must have at least one member'),
});

export function isValidPhone(phone: string): boolean {
  return PhoneSchema.safeParse(phone).success;
}

export function isValidPin(pin: string): boolean {
  return PinSchema.safeParse(pin).success;
}
