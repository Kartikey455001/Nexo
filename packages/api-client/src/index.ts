import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ProfileResponse,
  UpdateProfileRequest,
  PrivacySettingsResponse,
  UpdatePrivacySettingsRequest,
  CreateChatRequest,
  ChatResponse,
  SendMessageRequest,
  MessageResponse,
  PresignedUrlResponse,
  CreateStoryRequest,
  StoryResponse,
  UploadKeysRequest,
  FetchKeysResponse,
  StartCallRequest,
  CallResponse,
  IceServerResponse,
  FriendRequestResponse,
  SyncContactsRequest,
  UserSearchResponse,
  BusinessListing,
  CreateListingRequest,
  Appointment,
  CreateAppointmentRequest,
  PaymentRequestData,
  CreatePaymentRequest,
} from '@nexo/types';

export class NexoApiClient {
  private baseUrl: string;
  private tokenProvider: () => string | null;

  constructor(config: { baseUrl: string; getToken?: () => string | null }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.tokenProvider = config.getToken || (() => null);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.tokenProvider();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.message) {
          errorMessage = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : errorData.message;
        }
      } catch {}
      throw new Error(errorMessage);
    }

    return (await res.json()) as T;
  }

  // Auth
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }

  // Profiles & Users
  async getMyProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/profiles/me');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async searchUsers(query: string): Promise<ProfileResponse[]> {
    return this.request<ProfileResponse[]>(`/users/search?query=${encodeURIComponent(query)}`);
  }

  async setPin(pin: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/users/pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  async verifyPin(pin: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/users/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  // Privacy & Blocks
  async getPrivacySettings(): Promise<PrivacySettingsResponse> {
    return this.request<PrivacySettingsResponse>('/privacy');
  }

  async updatePrivacySettings(data: UpdatePrivacySettingsRequest): Promise<PrivacySettingsResponse> {
    return this.request<PrivacySettingsResponse>('/privacy', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async blockUser(userIdToBlock: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/blocks', {
      method: 'POST',
      body: JSON.stringify({ userIdToBlock }),
    });
  }

  // Chats & Messages
  async getChats(): Promise<ChatResponse[]> {
    return this.request<ChatResponse[]>('/chats');
  }

  async createChat(data: CreateChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChat(chatId: string): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/chats/${chatId}`);
  }

  async getMessages(chatId: string): Promise<MessageResponse[]> {
    return this.request<MessageResponse[]>(`/chats/${chatId}/messages`);
  }

  async sendMessage(chatId: string, data: SendMessageRequest): Promise<MessageResponse> {
    return this.request<MessageResponse>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Media & Stories
  async getUploadUrl(fileName: string, contentType: string): Promise<PresignedUrlResponse> {
    const query = new URLSearchParams({ filename: fileName, contentType });
    return this.request<PresignedUrlResponse>(`/media/presigned-url?${query.toString()}`);
  }

  async getStories(): Promise<StoryResponse[]> {
    return this.request<StoryResponse[]>('/stories');
  }

  async createStory(data: CreateStoryRequest): Promise<StoryResponse> {
    return this.request<StoryResponse>('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Calls
  async getIceServers(): Promise<IceServerResponse[]> {
    return this.request<IceServerResponse[]>('/calls/ice-servers');
  }

  async startCall(data: StartCallRequest): Promise<CallResponse> {
    return this.request<CallResponse>('/calls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endCall(callId: string): Promise<CallResponse> {
    return this.request<CallResponse>(`/calls/${callId}/end`, {
      method: 'PATCH',
    });
  }

  // Friends & Social Discovery
  async getFriends(): Promise<UserSearchResponse[]> {
    return this.request<UserSearchResponse[]>('/friends');
  }

  async sendFriendRequest(targetUserId: string): Promise<FriendRequestResponse> {
    return this.request<FriendRequestResponse>(`/friends/request/${targetUserId}`, {
      method: 'POST',
    });
  }

  async respondFriendRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<FriendRequestResponse> {
    return this.request<FriendRequestResponse>(`/friends/request/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async syncContacts(phoneHashes: string[]): Promise<UserSearchResponse[]> {
    return this.request<UserSearchResponse[]>('/friends/sync-contacts', {
      method: 'POST',
      body: JSON.stringify({ phoneHashes }),
    });
  }

  // AI Features
  async getSmartReplies(chatId: string): Promise<{ suggestions: string[] }> {
    return this.request<{ suggestions: string[] }>(`/chats/${chatId}/ai/smart-replies`, {
      method: 'POST',
    });
  }

  async summarizeChat(chatId: string): Promise<{ summary: string }> {
    return this.request<{ summary: string }>(`/chats/${chatId}/ai/summarize`, {
      method: 'POST',
    });
  }

  // Business Suite
  async getMyListings(): Promise<BusinessListing[]> {
    return this.request<BusinessListing[]>('/business/listings/my');
  }

  async getUserListings(userId: string): Promise<BusinessListing[]> {
    return this.request<BusinessListing[]>(`/business/listings/user/${userId}`);
  }

  async createListing(data: CreateListingRequest): Promise<BusinessListing> {
    return this.request<BusinessListing>('/business/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateListing(id: string, data: Partial<CreateListingRequest>): Promise<BusinessListing> {
    return this.request<BusinessListing>(`/business/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteListing(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/business/listings/${id}`, {
      method: 'DELETE',
    });
  }

  async getMyAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>('/business/appointments/my');
  }

  async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    return this.request<Appointment>('/business/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    return this.request<Appointment>(`/business/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getMyPayments(): Promise<PaymentRequestData[]> {
    return this.request<PaymentRequestData[]>('/business/payments/my');
  }

  async createPaymentRequest(data: CreatePaymentRequest): Promise<PaymentRequestData> {
    return this.request<PaymentRequestData>('/business/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payPaymentRequest(id: string, transactionId?: string): Promise<PaymentRequestData> {
    return this.request<PaymentRequestData>(`/business/payments/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ transactionId }),
    });
  }
}
