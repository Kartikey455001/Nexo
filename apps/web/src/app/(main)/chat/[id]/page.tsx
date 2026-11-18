"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/lib/store";
import {
  decryptMedia,
  decryptMessage,
  deriveSharedKey,
  encryptMedia,
  encryptMessage,
  generateIdentityKeyPair,
  getStoredIdentity,
  storeIdentity,
  type LocalIdentity,
} from "@/lib/crypto";
import { useCallStore } from "@/lib/call-store";
import {
  Send,
  Image as ImageIcon,
  Phone,
  PhoneMissed,
  Video,
  MoreVertical,
  Loader2,
  Sparkles,
  X,
  Lock,
  Clock,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  CheckCheck,
  ArrowLeft,
  Building2,
  Briefcase,
  CreditCard,
  Calendar,
  Package,
  Share2,
  Check,
  CheckCircle2,
  Monitor,
  Maximize2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type EncryptedPayload = {
  text: string;
  media?: {
    fileName: string;
    mimeType: string;
    fileIv: string;
    fileKey: string;
  };
};

async function encryptForRecipients(
  payload: EncryptedPayload,
  senderId: string,
  recipients: { userId: string; identityKeyPublic: string }[],
  identity: LocalIdentity,
) {
  const encryptedRecipients: Record<string, { cipherText: string; iv: string }> = {};
  for (const recipient of recipients) {
    const sharedKey = await deriveSharedKey(identity.privateKey, recipient.identityKeyPublic);
    encryptedRecipients[recipient.userId] = await encryptMessage(JSON.stringify(payload), sharedKey);
  }
  return JSON.stringify({ version: 1, senderId, recipients: encryptedRecipients });
}

async function decryptStoredMessage(
  message: any,
  userId: string,
  identity: LocalIdentity | null,
  publicKeyCache: Map<string, string>,
) {
  if (!message.content) {
    return { ...message, displayContent: "" };
  }

  // If not marked encrypted or is a structured / call-log payload, display directly
  if (
    !message.isEncrypted ||
    message.content.startsWith("CALL_LOG:") ||
    message.content.startsWith("[BUSINESS_LISTING]:") ||
    message.content.startsWith("[PAYMENT_REQUEST]:") ||
    message.content.startsWith("[MEETING_INVITE]:") ||
    message.content.startsWith("[PAYMENT_CONFIRMED]:") ||
    !message.content.startsWith("{")
  ) {
    return { ...message, displayContent: message.content };
  }

  try {
    let envelope: any;
    try {
      envelope = JSON.parse(message.content);
    } catch {
      return { ...message, displayContent: message.content };
    }

    if (!envelope || envelope.version !== 1 || !envelope.recipients || !envelope.recipients[userId]) {
      return { ...message, displayContent: message.content };
    }

    if (!identity?.privateKey) {
      return { ...message, displayContent: message.content };
    }

    let senderPublicKey = publicKeyCache.get(message.senderId);
    if (!senderPublicKey) {
      if (message.senderId === userId) {
        senderPublicKey = identity.identityKeyPublic;
      } else {
        const response = await api.get(`/e2e/keys/${message.senderId}`);
        senderPublicKey = response.data?.identityKeyPublic;
      }
      if (!senderPublicKey) throw new Error("The sender's public key is unavailable.");
      publicKeyCache.set(message.senderId, senderPublicKey);
    }

    const sharedKey = await deriveSharedKey(identity.privateKey, senderPublicKey);
    const recipientCipher = envelope.recipients[userId];
    const cleartext = await decryptMessage(recipientCipher.cipherText, recipientCipher.iv, sharedKey);
    const payload = JSON.parse(cleartext) as EncryptedPayload;
    let displayAttachmentUrl: string | undefined;

    if (message.attachmentUrl && payload.media) {
      const response = await fetch(message.attachmentUrl);
      if (!response.ok) throw new Error("Encrypted attachment could not be downloaded.");
      displayAttachmentUrl = await decryptMedia(
        await response.arrayBuffer(),
        payload.media.fileKey,
        payload.media.fileIv,
        payload.media.mimeType,
      );
    }

    return {
      ...message,
      displayContent: payload.text,
      displayAttachmentUrl,
      displayMediaType: payload.media?.mimeType,
      displayFileName: payload.media?.fileName,
    };
  } catch (error) {
    // If decryption error, return raw content if it's text or informative string
    return {
      ...message,
      displayContent: message.content || (error instanceof Error ? `Unable to decrypt: ${error.message}` : "Unable to decrypt this message."),
    };
  }
}

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const chatId = resolvedParams.id;
  const { user } = useAuthStore();

  const [chatInfo, setChatInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [messageError, setMessageError] = useState("");
  const identityRef = useRef<LocalIdentity | null>(null);
  const publicKeyCacheRef = useRef(new Map<string, string>());
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // Disappearing messages TTL
  const [ttlSeconds, setTtlSeconds] = useState<number>(0);
  const [showTtlMenu, setShowTtlMenu] = useState(false);

  // AI smart replies and summary
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  // Typing state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Business Suite in Chat states
  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showBusinessDrawer, setShowBusinessDrawer] = useState(false);
  const [businessListings, setBusinessListings] = useState<any[]>([]);

  // Payment form inside chat
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("USD");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Appointment form inside chat
  const [meetTitle, setMeetTitle] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetDuration, setMeetDuration] = useState("30");
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);

  // Payment execution modal for customer
  const [payingRequest, setPayingRequest] = useState<any | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvePublicKey = useCallback(
    async (targetUserId: string) => {
      if (!user?.userId) return null;
      if (targetUserId === user.userId) {
        return identityRef.current?.identityKeyPublic || null;
      }
      const cached = publicKeyCacheRef.current.get(targetUserId);
      if (cached) return cached;
      try {
        const response = await api.get(`/e2e/keys/${targetUserId}`);
        const publicKey = response.data?.identityKeyPublic as string | undefined;
        if (publicKey) {
          publicKeyCacheRef.current.set(targetUserId, publicKey);
          return publicKey;
        }
      } catch {
        // user might not have set up keys yet
      }
      return null;
    },
    [user?.userId]
  );

  const decryptMessageForDisplay = useCallback(
    async (message: any, activeIdentity: LocalIdentity) => {
      return decryptStoredMessage(message, user?.userId ?? "", activeIdentity, publicKeyCacheRef.current);
    },
    [user?.userId]
  );

  // Fetch chat details & messages
  useEffect(() => {
    let cancelled = false;
    const fetchChatDetails = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("nexo_token") : null;
        if (!token) {
          router.replace("/login");
          return;
        }
        const effectiveUser =
          user ||
          (typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("nexo-auth-storage") || "{}")?.state?.user
            : null);
        if (!effectiveUser?.email) {
          setIsLoading(false);
          return;
        }
        const normalizedEmail = effectiveUser.email.toLowerCase().trim();
        let activeId: LocalIdentity | null = await getStoredIdentity(normalizedEmail);

        if (!activeId) {
          const emptyBackup = {
            encryptedIdentityKeyBackup: "",
            identityKeyBackupSalt: "",
            identityKeyBackupIv: "",
          };
          const generated = await generateIdentityKeyPair();
          activeId = {
            identityKeyPublic: generated.identityKeyPublic,
            privateKey: generated.keyPair.privateKey,
          };
          await storeIdentity(normalizedEmail, activeId, emptyBackup).catch(() => {});
          // Always register the matching public key on server
          await api
            .post("/e2e/keys", {
              identityKeyPublic: generated.identityKeyPublic,
              ...emptyBackup,
              preKeys: [],
            })
            .catch(() => {});
        }

        identityRef.current = activeId;
        if (!cancelled && activeId) setIdentity(activeId);

        const [chatRes, messagesRes] = await Promise.all([
          api.get(`/chats/${chatId}`),
          api.get(`/chats/${chatId}/messages`).catch(() => ({ data: [] })),
        ]);

        const memberRows = await Promise.all(
          (chatRes.data?.members || []).map(async (member: any) => ({
            ...member,
            identityKeyPublic: await resolvePublicKey(member.userId),
          }))
        );

        const decryptedMessages = await Promise.all(
          (messagesRes.data || []).map((message: any) =>
            activeId ? decryptMessageForDisplay(message, activeId) : { ...message, displayContent: message.content }
          )
        );

        if (!cancelled) {
          setChatInfo({ ...chatRes.data, members: memberRows });
          setMessages(decryptedMessages);
        }
      } catch (err: any) {
        console.error("Failed to load chat data:", err);
        if (err?.response?.status === 401) {
          router.replace("/login");
          return;
        }
        if (!cancelled) {
          setMessageError(err instanceof Error ? err.message : "Could not unlock this conversation.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchChatDetails();

    const socket = getSocket();
    // Join socket room for this chat
    socket.emit("join_chat", { chatId });

    const handleNewMessage = async (msg: any) => {
      if (msg.chatId === chatId) {
        const activeIdentity = identityRef.current || identity;
        const decrypted = activeIdentity
          ? await decryptMessageForDisplay(msg, activeIdentity)
          : { ...msg, displayContent: msg.content };
        setMessages((prev) => (prev.some((item) => item.id === decrypted.id) ? prev : [...prev, decrypted]));
      }
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    const handleTypingEvent = (data: { chatId?: string; userId: string; isTyping: boolean }) => {
      if (data.userId !== user?.userId) {
        setIsPeerTyping(data.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => setIsPeerTyping(false), 3000);
        }
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("typing", handleTypingEvent);

    return () => {
      cancelled = true;
      socket.off("new_message", handleNewMessage);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("typing", handleTypingEvent);
    };
  }, [chatId, user?.userId, user?.email, decryptMessageForDisplay, resolvePublicKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing emitter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const socket = getSocket();
    socket.emit("typing", { chatId, isTyping: true });
  };

  // Plain send handler - immediate optimistic display + E2E/plain delivery
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !user?.userId) return;

    setSmartReplies([]);
    setInputText("");
    setMessageError("");

    try {
      const activeIdentity = identityRef.current || identity;
      const allMembersHaveKeys = Boolean(
        activeIdentity &&
          chatInfo?.members?.length &&
          chatInfo.members.every((m: any) => Boolean(m.identityKeyPublic))
      );

      let payload: any;
      if (allMembersHaveKeys && activeIdentity) {
        try {
          const encryptedContent = await encryptForRecipients(
            { text },
            user.userId,
            chatInfo.members,
            activeIdentity
          );
          payload = {
            content: encryptedContent,
            isEncrypted: true,
            ttl: ttlSeconds > 0 ? ttlSeconds : undefined,
          };
        } catch (encErr) {
          console.warn("Encryption failed, sending unencrypted fallback:", encErr);
          payload = {
            content: text,
            isEncrypted: false,
            ttl: ttlSeconds > 0 ? ttlSeconds : undefined,
          };
        }
      } else {
        payload = {
          content: text,
          isEncrypted: false,
          ttl: ttlSeconds > 0 ? ttlSeconds : undefined,
        };
      }

      const res = await api.post(`/chats/${chatId}/messages`, payload);
      const sentMsg = res.data;

      const displayMsg =
        activeIdentity && sentMsg.isEncrypted
          ? await decryptMessageForDisplay(sentMsg, activeIdentity)
          : { ...sentMsg, displayContent: text };

      setMessages((prev) => (prev.some((m) => m.id === sentMsg.id) ? prev : [...prev, displayMsg]));
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessageError(err instanceof Error ? err.message : "Failed to send your message.");
    }
  };

  // Send structured payload (Listings, Invoices, Meetings)
  const sendStructuredMessage = async (prefix: string, data: any) => {
    if (!user?.userId) return;
    const text = `${prefix}:${JSON.stringify(data)}`;
    try {
      const activeIdentity = identityRef.current || identity;
      const allMembersHaveKeys = Boolean(
        activeIdentity &&
          chatInfo?.members?.length &&
          chatInfo.members.every((m: any) => Boolean(m.identityKeyPublic))
      );

      let payload: any;
      if (allMembersHaveKeys && activeIdentity) {
        try {
          const encryptedContent = await encryptForRecipients(
            { text },
            user.userId,
            chatInfo.members,
            activeIdentity
          );
          payload = {
            content: encryptedContent,
            isEncrypted: true,
          };
        } catch {
          payload = {
            content: text,
            isEncrypted: false,
          };
        }
      } else {
        payload = {
          content: text,
          isEncrypted: false,
        };
      }

      const res = await api.post(`/chats/${chatId}/messages`, payload);
      const sentMsg = res.data;

      const displayMsg =
        activeIdentity && sentMsg.isEncrypted
          ? await decryptMessageForDisplay(sentMsg, activeIdentity)
          : { ...sentMsg, displayContent: text };

      setMessages((prev) => (prev.some((m) => m.id === sentMsg.id) ? prev : [...prev, displayMsg]));
    } catch (err) {
      console.error("Failed to send business message:", err);
    }
  };

  // WebRTC Start Call via Global Call Store
  const startCall = (type: "audio" | "video") => {
    const targetUserId = otherMemberObj?.userId;
    if (!targetUserId) {
      alert("No other member in this conversation to call.");
      return;
    }
    useCallStore.getState().startCall({
      targetUserId,
      chatId,
      callType: type,
      chatDisplayName,
      currentUser: {
        username: user?.username || undefined,
        fullName: user?.fullName || undefined,
        avatarUrl: user?.avatarUrl || undefined,
        businessName: user?.businessName || undefined,
      },
    });
  };

  const handleSummarize = () => {
    alert("AI summaries are unavailable in end-to-end encrypted chats.");
  };

  const handleSmartReply = (replyText: string) => {
    setInputText(replyText);
    setSmartReplies([]);
  };

  const handleFileSelect = () => {
    alert("Please select a file to encrypt and transmit.");
  };

  // Open business listings for sharing
  const openShareListingPicker = async () => {
    setShowBusinessMenu(false);
    setShowListingPicker(true);
    try {
      const res = await api.get("/business/listings/my").catch(() => ({ data: [] }));
      setBusinessListings(res.data || []);
    } catch {
      // handled
    }
  };

  // Send listing to chat
  const handleShareListing = (item: any) => {
    setShowListingPicker(false);
    sendStructuredMessage("[BUSINESS_LISTING]", {
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency || "USD",
      imageUrl: item.imageUrl,
      description: item.description,
      category: item.category,
    });
  };

  // Create payment request in chat
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceAmount || !invoiceDescription.trim()) return;
    setIsCreatingInvoice(true);
    try {
      const otherMember = chatInfo?.members?.find((m: any) => m.userId !== user?.userId);
      const res = await api.post("/business/payments", {
        customerId: otherMember?.userId,
        customerName: otherMember?.user?.profile?.fullName || otherMember?.user?.profile?.username,
        chatId,
        amount: parseFloat(invoiceAmount),
        currency: invoiceCurrency,
        description: invoiceDescription.trim(),
      });

      setShowPaymentModal(false);
      setInvoiceAmount("");
      setInvoiceDescription("");

      sendStructuredMessage("[PAYMENT_REQUEST]", {
        id: res.data.id,
        amount: res.data.amount,
        currency: res.data.currency,
        description: res.data.description,
        status: "PENDING",
      });
    } catch (err: any) {
      alert("Failed to create invoice request.");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Customer pays the invoice
  const handleConfirmPay = async () => {
    if (!payingRequest) return;
    setIsProcessingPayment(true);
    try {
      await api.patch(`/business/payments/${payingRequest.id}/pay`, {
        paymentMethod: "INSTANT_VERIFIED",
      });
      alert("Payment successful! Transaction receipt generated.");
      setPayingRequest(null);

      // Notify in chat
      sendStructuredMessage("[PAYMENT_CONFIRMED]", {
        id: payingRequest.id,
        amount: payingRequest.amount,
        currency: payingRequest.currency,
        description: payingRequest.description,
      });
    } catch (err: any) {
      alert("Payment failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Schedule meeting in chat
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetTitle.trim() || !meetDate || !meetTime) return;
    setIsCreatingMeet(true);
    try {
      const scheduledAt = new Date(`${meetDate}T${meetTime}`);
      const otherMember = chatInfo?.members?.find((m: any) => m.userId !== user?.userId);

      const res = await api.post("/business/appointments", {
        clientId: otherMember?.userId,
        clientName: otherMember?.user?.profile?.fullName || otherMember?.user?.profile?.username,
        title: meetTitle.trim(),
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: parseInt(meetDuration) || 30,
        meetingLink: `/chat/${chatId}`,
      });

      setShowAppointmentModal(false);
      setMeetTitle("");
      setMeetDate("");
      setMeetTime("");

      sendStructuredMessage("[MEETING_INVITE]", {
        id: res.data.id,
        title: res.data.title,
        scheduledAt: res.data.scheduledAt,
        durationMinutes: res.data.durationMinutes,
      });
    } catch (err: any) {
      alert("Failed to schedule meeting.");
    } finally {
      setIsCreatingMeet(false);
    }
  };

  // Chat Peer Info
  const otherMemberObj = chatInfo?.members?.find((m: any) => m.userId !== user?.userId);
  const otherUser = otherMemberObj?.user?.profile;
  const isOtherUserBusiness = otherMemberObj?.user?.accountType === "BUSINESS" || Boolean(otherUser?.businessName);

  const chatDisplayName = chatInfo?.isGroup
    ? chatInfo?.name || "Group Chat"
    : otherUser?.businessName || otherUser?.fullName || otherUser?.username || "Direct Chat";

  return (
    <div className="flex flex-col h-full bg-background/50 relative overflow-hidden selection:bg-cyan-300 selection:text-black">
      {/* Chat Header */}
      <div className="h-16 glass border-b border-border/50 flex items-center justify-between px-4 sm:px-6 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <Link
            href="/chat"
            className="md:hidden p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Back to Chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div
            onClick={() => isOtherUserBusiness && setShowBusinessDrawer(true)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              isOtherUserBusiness
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 cursor-pointer hover:ring-2 hover:ring-cyan-400/30"
                : "bg-primary/20 border border-primary/30 text-primary"
            }`}
          >
            {chatDisplayName.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2
                onClick={() => isOtherUserBusiness && setShowBusinessDrawer(true)}
                className={`font-semibold text-foreground leading-tight text-sm truncate ${
                  isOtherUserBusiness ? "hover:text-cyan-300 cursor-pointer" : ""
                }`}
              >
                {chatDisplayName}
              </h2>
              {isOtherUserBusiness && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Business
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
              {isPeerTyping && (
                <span className="text-[11px] text-primary italic animate-pulse">
                  typing...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Call */}
          <button
            onClick={() => startCall("audio")}
            className="w-9 h-9 rounded-xl glass hover:bg-cyan-400/20 hover:text-cyan-300 flex items-center justify-center text-muted-foreground transition-all shadow-sm"
            title="Start Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video Call */}
          <button
            onClick={() => startCall("video")}
            className="w-9 h-9 rounded-xl glass hover:bg-cyan-400/20 hover:text-cyan-300 flex items-center justify-center text-muted-foreground transition-all shadow-sm"
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Business Profile Drawer toggle */}
          {isOtherUserBusiness && (
            <button
              onClick={() => setShowBusinessDrawer(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 text-xs font-semibold border border-cyan-400/30 transition-all"
            >
              <Building2 className="w-3.5 h-3.5" />
              Storefront
            </button>
          )}

          <button
            onClick={handleSummarize}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-all border border-primary/25"
            title="AI summaries are unavailable for end-to-end encrypted conversations"
          >
            <Lock className="w-3.5 h-3.5" />
            Private
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 z-0 relative">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-cyan-300" />
            <span className="text-xs text-muted-foreground">Decrypting conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-3 text-cyan-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-foreground text-base mb-1">
              End-to-End Encrypted Session
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Messages, listings, and payment transactions are protected with client-side keys.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.userId;

            // Check if call log payload
            const rawContent = msg.displayContent || msg.content || "";
            const isCallLog = rawContent.startsWith("CALL_LOG:");
            let callLogData: {
              callType?: "audio" | "video";
              status?: "completed" | "missed" | "declined";
              duration?: number;
              timestamp?: string;
            } | null = null;
            if (isCallLog) {
              try {
                callLogData = JSON.parse(rawContent.replace("CALL_LOG:", ""));
              } catch {}
            }

            if (isCallLog && callLogData) {
              return (
                <div key={msg.id} className="flex w-full justify-center my-2">
                  <div className="w-full max-w-sm rounded-2xl bg-[#0f141f]/95 border border-white/10 p-3.5 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            callLogData.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : callLogData.status === "missed"
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          )}
                        >
                          {callLogData.callType === "video" ? (
                            callLogData.status === "missed" ? (
                              <VideoOff className="w-5 h-5" />
                            ) : (
                              <Video className="w-5 h-5" />
                            )
                          ) : callLogData.status === "missed" ? (
                            <PhoneMissed className="w-5 h-5" />
                          ) : callLogData.status === "declined" ? (
                            <PhoneOff className="w-5 h-5" />
                          ) : (
                            <Phone className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-xs text-white truncate">
                              {callLogData.callType === "video" ? "Video Call" : "Voice Call"}
                            </h4>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0",
                                callLogData.status === "completed"
                                  ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                                  : callLogData.status === "missed"
                                  ? "bg-rose-400/15 text-rose-300 border border-rose-400/30"
                                  : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                              )}
                            >
                              {callLogData.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 truncate">
                            {callLogData.status === "completed" && typeof callLogData.duration === "number" ? (
                              <span>
                                Duration:{" "}
                                {Math.floor(callLogData.duration / 60) > 0
                                  ? `${Math.floor(callLogData.duration / 60)}m ${callLogData.duration % 60}s`
                                  : `${callLogData.duration}s`}
                              </span>
                            ) : (
                              <span>{callLogData.status === "missed" ? "Missed Call" : "Call Declined"}</span>
                            )}
                            <span>•</span>
                            <span>
                              {new Date(msg.createdAt || callLogData.timestamp || Date.now()).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => startCall(callLogData?.callType === "video" ? "video" : "audio")}
                        className="px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 text-xs font-semibold border border-cyan-400/30 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        {callLogData?.callType === "video" ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        <span>Call back</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Check if special business payload
            const isListing = rawContent.startsWith("[BUSINESS_LISTING]:");
            const isPaymentReq = rawContent.startsWith("[PAYMENT_REQUEST]:");
            const isMeetingInvite = rawContent.startsWith("[MEETING_INVITE]:");
            const isPaymentConfirmed = rawContent.startsWith("[PAYMENT_CONFIRMED]:");

            let listingData: any = null;
            let paymentData: any = null;
            let meetingData: any = null;
            let paymentConfirmData: any = null;

            try {
              if (isListing) listingData = JSON.parse(rawContent.replace("[BUSINESS_LISTING]:", ""));
              if (isPaymentReq) paymentData = JSON.parse(rawContent.replace("[PAYMENT_REQUEST]:", ""));
              if (isMeetingInvite) meetingData = JSON.parse(rawContent.replace("[MEETING_INVITE]:", ""));
              if (isPaymentConfirmed) paymentConfirmData = JSON.parse(rawContent.replace("[PAYMENT_CONFIRMED]:", ""));
            } catch {
              // fallback to regular render
            }

            return (
              <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] sm:max-w-[70%] rounded-2xl text-sm relative group transition-all",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm shadow-md shadow-primary/20"
                      : "glass text-foreground rounded-bl-sm border border-white/10",
                    (isListing || isPaymentReq || isMeetingInvite) && "!bg-[#10141d] !border-cyan-400/30 text-white shadow-xl"
                  )}
                >
                  {/* 1. BUSINESS LISTING CARD */}
                  {isListing && listingData ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold border-b border-white/10 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-cyan-300" />
                          Business Catalog Listing
                        </span>
                        <span className="bg-cyan-400/10 px-2 py-0.5 rounded text-[10px]">
                          {listingData.category || "General"}
                        </span>
                      </div>

                      {listingData.imageUrl && (
                        <div className="w-full h-40 rounded-xl overflow-hidden bg-black">
                          <img src={listingData.imageUrl} alt={listingData.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-base">{listingData.title}</h4>
                          <span className="font-extrabold text-cyan-300 text-lg">
                            {listingData.currency} {listingData.price}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {listingData.description}
                        </p>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setInputText(`Hi, I'm interested in ordering: "${listingData.title}"`)}
                          className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shadow-md shadow-cyan-400/20"
                        >
                          Inquire / Order
                        </button>
                      </div>
                    </div>
                  ) : isPaymentReq && paymentData ? (
                    /* 2. PAYMENT REQUEST CARD */
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold border-b border-white/10 pb-2">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          Official Payment Request
                        </span>
                        <span className="bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                          Pending
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-xs text-zinc-400">Total Requested</p>
                          <div className="text-2xl font-black text-white">
                            {paymentData.currency} {paymentData.amount}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-400">Invoice Note</p>
                          <p className="text-xs font-semibold text-zinc-200">{paymentData.description}</p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                        {!isMe ? (
                          <button
                            onClick={() => setPayingRequest(paymentData)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay Now
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">
                            Waiting for client to clear invoice
                          </span>
                        )}
                      </div>
                    </div>
                  ) : isMeetingInvite && meetingData ? (
                    /* 3. MEETING INVITATION CARD */
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold border-b border-white/10 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          Consultation Meeting Invitation
                        </span>
                        <span className="bg-indigo-400/15 text-indigo-300 px-2 py-0.5 rounded text-[10px]">
                          {meetingData.durationMinutes} Mins
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-base">{meetingData.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-300 mt-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-300" />
                          <span>
                            {new Date(meetingData.scheduledAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end border-t border-white/10">
                        <button
                          onClick={() => startCall("video")}
                          className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs shadow-md shadow-cyan-400/20 flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join NEXO Video Call
                        </button>
                      </div>
                    </div>
                  ) : isPaymentConfirmed && paymentConfirmData ? (
                    /* 4. PAYMENT CONFIRMATION NOTICE */
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Payment Verified & Settled</h4>
                        <p className="text-xs text-zinc-400">
                          {paymentConfirmData.currency} {paymentConfirmData.amount} paid for &quot;
                          {paymentConfirmData.description}&quot;
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* REGULAR MESSAGE */
                    <div className="p-3.5">
                      {msg.attachmentUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                          {msg.displayAttachmentUrl ? (
                            msg.displayMediaType?.startsWith("video/") ? (
                              <video src={msg.displayAttachmentUrl} controls playsInline className="max-h-72 w-full" />
                            ) : msg.displayMediaType?.startsWith("image/") ? (
                              <img src={msg.displayAttachmentUrl} alt={msg.displayFileName || "attachment"} className="w-full h-auto object-cover max-h-72" />
                            ) : (
                              <a href={msg.displayAttachmentUrl} download={msg.displayFileName || "attachment"} className="block p-3 text-xs underline">
                                Download {msg.displayFileName || "attachment"}
                              </a>
                            )
                          ) : (
                            <div className="p-3 text-xs text-muted-foreground">Decrypting attachment…</div>
                          )}
                        </div>
                      )}

                      {msg.displayContent && <div className="leading-relaxed break-words">{msg.displayContent}</div>}

                      <div className={cn("flex items-center justify-end gap-1.5 mt-1 text-[10px]", isMe ? "text-primary-foreground/75" : "text-muted-foreground")}>
                        {msg.isEncrypted && <Lock className="w-3 h-3 text-emerald-400" />}
                        {msg.expiresAt && <Clock className="w-3 h-3 text-amber-400" />}
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Toolbar & Area */}
      <div className="p-3 sm:p-4 glass border-t border-border/50 z-10">
        {messageError && (
          <p role="alert" className="mx-auto mb-2 max-w-4xl rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-xs text-rose-200">
            {messageError}
          </p>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto relative">
          {/* Business Tools Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBusinessMenu((v) => !v)}
              className={cn(
                "p-2.5 rounded-xl transition-all flex items-center justify-center",
                showBusinessMenu
                  ? "bg-cyan-400 text-black shadow-md shadow-cyan-400/20"
                  : "glass hover:bg-cyan-400/20 hover:text-cyan-300 text-muted-foreground"
              )}
              title="Business Commerce Tools"
            >
              <Briefcase className="w-4 h-4" />
            </button>

            {showBusinessMenu && (
              <div className="absolute bottom-12 left-0 w-60 rounded-2xl glass border border-white/10 bg-[#0d1117] p-2 shadow-2xl z-30 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Business Tools
                </div>

                <button
                  type="button"
                  onClick={openShareListingPicker}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors text-left"
                >
                  <Package className="w-4 h-4 text-cyan-400" />
                  <span>Share Product / Listing</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBusinessMenu(false);
                    setShowPaymentModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-emerald-400/10 hover:text-emerald-300 transition-colors text-left"
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Request Payment / Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBusinessMenu(false);
                    setShowAppointmentModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-indigo-400/10 hover:text-indigo-300 transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Schedule Client Meeting</span>
                </button>
              </div>
            )}
          </div>

          {/* Disappearing timer selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTtlMenu((v) => !v)}
              className={cn(
                "p-2.5 rounded-xl transition-all flex items-center justify-center",
                ttlSeconds > 0
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  : "glass hover:bg-secondary/60 text-muted-foreground"
              )}
              title="Disappearing Messages"
            >
              <Clock className="w-4 h-4" />
            </button>

            {showTtlMenu && (
              <div className="absolute bottom-12 left-0 w-36 rounded-2xl glass border border-white/10 bg-[#0d1117] p-1.5 shadow-2xl z-30 space-y-1">
                {[
                  { label: "Off", value: 0 },
                  { label: "30 Seconds", value: 30 },
                  { label: "5 Minutes", value: 300 },
                  { label: "1 Hour", value: 3600 },
                  { label: "24 Hours", value: 86400 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setTtlSeconds(opt.value);
                      setShowTtlMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                      ttlSeconds === opt.value
                        ? "bg-cyan-400 text-black font-semibold"
                        : "text-zinc-300 hover:bg-secondary"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input field */}
          <div className="flex-1 bg-input/60 border border-border/60 rounded-2xl flex items-center px-4 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Write a message…"
              className="w-full bg-transparent border-none py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-2xl bg-cyan-400 hover:bg-cyan-300 flex items-center justify-center text-black font-bold shadow-md shadow-cyan-400/20 transition-all disabled:opacity-40 disabled:shadow-none active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>



      {/* MODAL: SHARE LISTING PICKER */}
      {showListingPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-300" />
                Select Listing to Share in Chat
              </h3>
              <button onClick={() => setShowListingPicker(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {businessListings.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  You have not created any listings yet. Open the{" "}
                  <Link href="/business" className="text-cyan-300 underline">
                    Business Suite
                  </Link>{" "}
                  to add products.
                </div>
              ) : (
                businessListings.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 hover:border-cyan-300/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                        <span className="font-bold text-xs text-cyan-300">
                          {item.currency} {item.price}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleShareListing(item)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs shrink-0"
                    >
                      Send
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PAYMENT REQUEST */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Send Payment Request
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="100"
                    className="w-full h-9 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Currency</label>
                  <select
                    value={invoiceCurrency}
                    onChange={(e) => setInvoiceCurrency(e.target.value)}
                    className="w-full h-9 rounded-xl border border-white/10 bg-[#161b26] px-2 text-xs text-zinc-200 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Description / Deliverable *</label>
                <textarea
                  rows={2}
                  required
                  value={invoiceDescription}
                  onChange={(e) => setInvoiceDescription(e.target.value)}
                  placeholder="e.g. Deposit for web design project..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInvoice}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs disabled:opacity-50"
                >
                  {isCreatingInvoice ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE CLIENT MEETING */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Schedule Client Meeting
              </h3>
              <button onClick={() => setShowAppointmentModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  placeholder="e.g. Requirement Gathering Call"
                  className="w-full h-9 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={meetDate}
                    onChange={(e) => setMeetDate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={meetTime}
                    onChange={(e) => setMeetTime(e.target.value)}
                    className="w-full h-9 rounded-xl border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Duration</label>
                <select
                  value={meetDuration}
                  onChange={(e) => setMeetDuration(e.target.value)}
                  className="w-full h-9 rounded-xl border border-white/10 bg-[#161b26] px-2 text-xs text-zinc-200 outline-none"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMeet}
                  className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {isCreatingMeet ? "Scheduling..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER PAY FLOW */}
      {payingRequest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-emerald-400/30 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
              <CreditCard className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-lg text-white">Complete Payment</h3>
            <p className="text-xs text-zinc-400 mt-1">To: {chatDisplayName}</p>

            <div className="my-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-xs text-zinc-400">Total Amount</span>
              <div className="text-3xl font-black text-white mt-0.5">
                {payingRequest.currency} {payingRequest.amount}
              </div>
              <p className="text-xs text-zinc-300 mt-1 font-medium">{payingRequest.description}</p>
            </div>

            <p className="text-[11px] text-zinc-400 mb-6">
              Instant settlement via Secure NEXO Commercial Gateway.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPayingRequest(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmPay}
                className="flex-1 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs shadow-lg shadow-emerald-400/20 disabled:opacity-50"
              >
                {isProcessingPayment ? "Processing..." : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER: BUSINESS PROFILE & CATALOG DRAWER */}
      {showBusinessDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-[#10141d] border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-base text-white">Business Storefront</h3>
              </div>
              <button
                onClick={() => setShowBusinessDrawer(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-cyan-400/20 border-2 border-cyan-400/40 text-cyan-300 font-black text-2xl flex items-center justify-center mb-3">
                {chatDisplayName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-white">{chatDisplayName}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-400/30 mt-1">
                <Sparkles className="w-3 h-3" />
                {otherUser?.businessCategory || "Verified Merchant"}
              </span>

              {otherUser?.businessDescription && (
                <p className="text-xs text-zinc-400 mt-3 max-w-xs leading-relaxed">
                  {otherUser.businessDescription}
                </p>
              )}
            </div>

            {/* Business Attributes */}
            <div className="space-y-2 mb-6">
              {otherUser?.businessHours && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Hours</span>
                  <span className="font-medium text-white">{otherUser.businessHours}</span>
                </div>
              )}
              {otherUser?.businessWebsite && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Website</span>
                  <a href={otherUser.businessWebsite} target="_blank" rel="noreferrer" className="text-cyan-300 underline font-medium">
                    {otherUser.businessWebsite.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {otherUser?.businessUpiId && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Payment Handle</span>
                  <span className="font-mono text-emerald-400">{otherUser.businessUpiId}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-4 border-t border-white/10 flex gap-2">
              <button
                onClick={() => {
                  setShowBusinessDrawer(false);
                  startCall("video");
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Video className="w-4 h-4" />
                Call Business
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
