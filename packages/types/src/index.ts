export interface DeviceMetadata {
  platform: 'web' | 'android' | 'ios';
  appVersion?: string;
  deviceName: string;
}

export type AccountType = 'PERSONAL' | 'BUSINESS';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  accountType?: AccountType;
  businessName?: string;
  businessCategory?: string;
  businessDescription?: string;
  businessHours?: string;
  businessAddress?: string;
  businessWebsite?: string;
  businessUpiId?: string;
  device: DeviceMetadata;
}

export interface LoginRequest {
  email: string;
  password: string;
  device: DeviceMetadata;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  isNewUser: boolean;
  user: {
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    username: string | null;
    fullName: string | null;
    accountType?: AccountType;
    businessName?: string | null;
    businessCategory?: string | null;
    businessDescription?: string | null;
    businessHours?: string | null;
    businessAddress?: string | null;
    businessWebsite?: string | null;
    businessUpiId?: string | null;
  };
  tokens: AuthTokens;
  device: {
    id: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  tokens: AuthTokens;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  accountType?: AccountType;
  businessName?: string | null;
  businessCategory?: string | null;
  businessDescription?: string | null;
  businessHours?: string | null;
  businessAddress?: string | null;
  businessWebsite?: string | null;
  businessUpiId?: string | null;
  paymentDetails?: string | null;
}

export interface UpdateProfileRequest {
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  accountType?: AccountType;
  businessName?: string;
  businessCategory?: string;
  businessDescription?: string;
  businessHours?: string;
  businessAddress?: string;
  businessWebsite?: string;
  businessUpiId?: string;
  paymentDetails?: string;
}

export interface PrivacySettingsResponse {
  lastSeen: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  profilePhotoVisibility: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  readReceipts: boolean;
}

export interface UpdatePrivacySettingsRequest {
  lastSeen?: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  profilePhotoVisibility?: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  readReceipts?: boolean;
}

export interface BlockUserRequest {
  userIdToBlock: string;
}

export interface SearchUserResponse {
  profiles: ProfileResponse[];
}

// Phase 4: Messaging DTOs

export interface CreateChatRequest {
  isGroup: boolean;
  name?: string;
  memberIds: string[];
}

export interface ChatResponse {
  id: string;
  isGroup: boolean;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  members: {
    userId: string;
    joinedAt: string;
    user: {
      profile: {
        username: string;
        avatarUrl: string | null;
      }
    }
  }[];
}

export interface SendMessageRequest {
  content?: string;
  attachmentUrl?: string;
  isEncrypted?: boolean;
  ttl?: number; // Time-to-Live in seconds for disappearing messages
}

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  attachmentUrl: string | null;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phase 5: Media & Stories DTOs

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

export interface CreateStoryRequest {
  mediaUrl: string;
}

export interface StoryResponse {
  id: string;
  userId: string;
  mediaUrl: string;
  expiresAt: string;
  createdAt: string;
  user: {
    profile: {
      username: string;
      avatarUrl: string | null;
    }
  }
}

// Phase 6: E2EE DTOs

export interface UploadKeysRequest {
  identityKeyPublic: string;
  encryptedIdentityKeyBackup?: string;
  identityKeyBackupSalt?: string;
  identityKeyBackupIv?: string;
  preKeys: {
    keyId: number;
    publicKey: string;
  }[];
}

export interface FetchKeysResponse {
  identityKeyPublic: string;
  preKey: {
    keyId: number;
    publicKey: string;
  } | null;
}

// Phase 7: Voice & Video Calling DTOs

export interface StartCallRequest {
  chatId: string;
}

export interface CallResponse {
  id: string;
  chatId: string;
  initiatorId: string;
  status: 'ONGOING' | 'COMPLETED' | 'MISSED';
  startedAt: string;
  endedAt: string | null;
}

export interface IceServerResponse {
  urls: string;
  username?: string;
  credential?: string;
}

// Phase 8: Push Notification DTOs

export interface UpdateFcmTokenRequest {
  fcmToken: string;
}

// Phase 9: Social & Discovery DTOs

export interface FriendRequestResponse {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
}

export interface SyncContactsRequest {
  phoneHashes: string[];
}

export interface UserSearchResponse {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isFriend: boolean;
}

// Phase 10: Advanced Privacy

export interface ScreenshotAlertRequest {
  chatId: string;
}

// Business Suite Interfaces

export interface BusinessListing {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  category?: string | null;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
  inStock?: boolean;
}

export interface Appointment {
  id: string;
  businessId: string;
  clientId: string;
  clientName?: string | null;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string | null;
  meetingLink?: string | null;
  createdAt: string;
}

export interface CreateAppointmentRequest {
  clientId?: string;
  clientName?: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
  meetingLink?: string;
}

export interface PaymentRequestData {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string | null;
  chatId?: string | null;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paymentMethod?: string | null;
  receiptUrl?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface CreatePaymentRequest {
  customerId?: string;
  customerName?: string;
  chatId?: string;
  amount: number;
  currency?: string;
  description: string;
}
