"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import {
  Loader2,
  MessageSquare,
  Plus,
  Settings,
  LogOut,
  Search,
  Users,
  X,
  Camera,
  Check,
  Sparkles,
  Building2,
  Phone,
  PhoneOff,
  Video,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CallModal } from "@/components/CallModal";
import { useCallStore } from "@/lib/call-store";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, logout, user } = useAuthStore();
  const [chats, setChats] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [newChatError, setNewChatError] = useState("");

  // Story upload & view state
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  const fetchChatsAndStories = async () => {
    try {
      const [chatsRes, storiesRes] = await Promise.all([
        api.get("/chats").catch(() => ({ data: [] })),
        api.get("/stories").catch(() => ({ data: [] })),
      ]);
      setChats(chatsRes.data || []);
      setStories(storiesRes.data || []);
    } catch (err: any) {
      console.error("Failed to load initial data:", err);
      if (err?.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nexo_token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    const socket = connectSocket();
    fetchChatsAndStories();

    const expireSession = () => {
      logout();
      localStorage.removeItem("nexo_token");
      localStorage.removeItem("nexo_refresh_token");
      disconnectSocket();
      router.replace("/login");
    };
    window.addEventListener("nexo:session-expired", expireSession);

    const handleNewMessage = (msg: any) => {
      // Re-order chats or update last message
      setChats((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === msg.chatId);
        if (existingIndex > -1) {
          const updatedChat = {
            ...prev[existingIndex],
            lastMessage: msg.attachmentUrl ? "Encrypted attachment" : (msg.content?.startsWith("{") ? "Encrypted message" : (msg.content || "New message")),
            updatedAt: msg.createdAt,
          };
          const next = [...prev];
          next.splice(existingIndex, 1);
          return [updatedChat, ...next];
        } else {
          // Newly created chat, refresh chats
          fetchChatsAndStories();
        }
        return prev;
      });
    };

    socket.on("new_message", handleNewMessage);
    const cleanupCallListeners = useCallStore.getState().initSocketListeners(user?.userId || "");

    return () => {
      socket.off("new_message", handleNewMessage);
      cleanupCallListeners();
      window.removeEventListener("nexo:session-expired", expireSession);
    };
  }, [router, logout, user?.userId]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Local sign-out still completes if the API is offline.
    }
    logout();
    localStorage.removeItem("nexo_token");
    localStorage.removeItem("nexo_refresh_token");
    disconnectSocket();
    router.push("/login");
  };

  // Search users for new chat
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/users/search?query=${encodeURIComponent(searchQuery)}`);
        // Filter out ourselves
        const filtered = (res.data || []).filter((p: any) => p.userId !== user?.userId);
        setSearchResults(filtered);
        setNewChatError("");
      } catch {
        setNewChatError("User search is temporarily unavailable. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.userId]);

  const handleCreateDirectChat = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === user?.userId) {
      setNewChatError("Choose another account to start a conversation.");
      return;
    }
    setNewChatError("");
    setIsCreatingChat(true);
    try {
      const res = await api.post("/chats", {
        isGroup: false,
        memberIds: [targetUserId],
      });
      setShowNewChatModal(false);
      setSearchQuery("");
      await fetchChatsAndStories();
      router.push(`/chat/${res.data.id}`);
    } catch {
      setNewChatError("Could not create this conversation. Check that the account still exists and try again.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    setNewChatError("");
    setIsCreatingChat(true);
    try {
      const res = await api.post("/chats", {
        isGroup: true,
        name: groupName.trim(),
        memberIds: selectedUserIds,
      });
      setShowNewChatModal(false);
      setGroupName("");
      setSelectedUserIds([]);
      setIsGroupMode(false);
      await fetchChatsAndStories();
      router.push(`/chat/${res.data.id}`);
    } catch {
      setNewChatError("Could not create this group. Please try again.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Story upload handler
  const handleStoryFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStory(true);
    try {
      // 1. Get presigned upload URL
      const { data: presigned } = await api.get("/media/presigned-url", {
        params: { filename: file.name, contentType: file.type || "application/octet-stream" },
      });

      // 2. Upload file directly to S3 / MinIO
      await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      // 3. Create story record in backend
      await api.post("/stories", {
        mediaUrl: presigned.fileUrl,
      });

      // 4. Refresh stories reel
      const storiesRes = await api.get("/stories");
      setStories(storiesRes.data || []);
    } catch (err) {
      console.error("Failed to upload story:", err);
      alert("Failed to upload story. Please try again.");
    } finally {
      setIsUploadingStory(false);
      if (storyFileInputRef.current) storyFileInputRef.current.value = "";
    }
  };



  if (!isAuthenticated && isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-9 h-9 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm animate-pulse tracking-wide font-medium">
          Connecting to NEXO E2EE Network...
        </p>
      </div>
    );
  }

  const isAtChatIndex = pathname === "/chat";

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative selection:bg-primary selection:text-white">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 animated-gradient opacity-[0.03] blur-[100px] pointer-events-none" />

      {/* Sidebar - responsive: full width on mobile when on /chat, hidden on mobile when viewing a chat or business */}
      <aside
        className={cn(
          "h-full glass border-r border-border/50 flex flex-col z-10 transition-all",
          isAtChatIndex ? "w-full md:w-80 flex" : "w-full md:w-80 hidden md:flex"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <Link href="/chat" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/40 group-hover:ring-primary/80 transition-all shadow-md shadow-primary/20">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-foreground">NEXO</span>
              <span className="text-[10px] text-muted-foreground font-mono">Encrypted</span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/business"
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all",
                pathname === "/business"
                  ? "bg-cyan-400 text-black shadow-md shadow-cyan-400/20"
                  : "bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 border border-cyan-400/20"
              )}
              title="Open Business Suite"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Business</span>
            </Link>

            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-9 h-9 rounded-xl bg-secondary hover:bg-primary/20 hover:text-primary text-secondary-foreground flex items-center justify-center transition-all ring-1 ring-white/10"
              title="Start New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stories Reel */}
        <div className="flex gap-3 overflow-x-auto p-3.5 border-b border-border/50 hide-scrollbar bg-black/10 items-center">
          {/* Add Story Button */}
          <input
            type="file"
            accept="image/*,video/*"
            ref={storyFileInputRef}
            onChange={handleStoryFileSelected}
            className="hidden"
          />
          <div
            onClick={() => storyFileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 cursor-pointer min-w-max group"
          >
            <div className="w-13 h-13 rounded-full bg-secondary/80 border-2 border-dashed border-primary/50 group-hover:border-primary flex items-center justify-center transition-colors">
              {isUploadingStory ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Camera className="w-5 h-5 text-primary" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium group-hover:text-foreground">
              Add Story
            </span>
          </div>

          {/* Stories List */}
          {stories.map((story) => (
            <div
              key={story.id}
              onClick={() => setActiveStory(story)}
              className="flex flex-col items-center gap-1 cursor-pointer min-w-max group"
            >
              <div className="w-13 h-13 rounded-full p-[2px] bg-gradient-to-tr from-primary via-indigo-500 to-purple-500 shadow-sm group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-xs font-bold uppercase overflow-hidden">
                  {story.mediaUrl && story.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                    <img src={story.mediaUrl} alt="story" className="w-full h-full object-cover" />
                  ) : (
                    story.user?.profile?.username?.charAt(0) || "U"
                  )}
                </div>
              </div>
              <span className="text-[10px] text-foreground font-medium truncate max-w-[56px]">
                {story.user?.profile?.username || "User"}
              </span>
            </div>
          ))}
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading chats...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No chats yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Start a secure end-to-end encrypted conversation.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 transition-all"
              >
                Find Contacts
              </button>
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`;
              const otherMember = chat.members?.find((m: any) => m.userId !== user?.userId);
              const displayName = chat.isGroup
                ? chat.name || "Group Chat"
                : otherMember?.user?.profile?.username || "Direct Chat";
              const avatarChar = displayName.charAt(0).toUpperCase();

              return (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl transition-all relative group",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                      : "hover:bg-secondary/60 text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm ring-1 flex-shrink-0",
                      isActive
                        ? "bg-primary text-white ring-primary/50"
                        : "bg-secondary text-secondary-foreground ring-white/10"
                    )}
                  >
                    {chat.isGroup ? <Users className="w-5 h-5" /> : avatarChar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-semibold text-sm truncate text-foreground">
                        {displayName}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(chat.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.lastMessage || "Tap to chat"}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3.5 border-t border-border/50 flex items-center justify-between bg-black/20">
          <Link href="/profile" className="flex items-center gap-3 group flex-1 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
              {(user?.fullName || user?.email || "ME").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {user?.fullName || user?.email || "My Account"}
                </span>
                {user?.accountType === "BUSINESS" && (
                  <span className="px-1.5 py-0.2 rounded-md bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 text-[9px] font-bold uppercase">
                    PRO
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {user?.accountType === "BUSINESS" ? "Business Mode" : "Personal Mode"}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/profile"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Profile & Privacy Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane - hidden on mobile when showing the chats list */}
      <main
        className={cn(
          "flex-1 h-full z-10 flex flex-col relative overflow-hidden",
          isAtChatIndex && "hidden md:flex"
        )}
      >
        {children}
      </main>

      {/* New Chat / User Search Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass max-w-md w-full rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg text-foreground">
                  {isGroupMode ? "Create Group Chat" : "New Conversation"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setNewChatError("");
                  setIsGroupMode(false);
                  setSelectedUserIds([]);
                }}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Group vs Direct */}
            <div className="flex gap-2 my-4 p-1 bg-secondary/50 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setIsGroupMode(false)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  !isGroupMode ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setIsGroupMode(true)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  isGroupMode ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Group Chat
              </button>
            </div>

            {isGroupMode && (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project NEXO"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {newChatError && <p role="alert" className="mb-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-xs text-rose-200">{newChatError}</p>}

            {/* User Search Results */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] pr-1">
              {searchQuery.length < 2 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Type at least 2 characters to find users...
                </p>
              ) : searchResults.length === 0 && !isSearching ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No users found matching &quot;{searchQuery}&quot;
                </p>
              ) : (
                searchResults.map((profile) => {
                  const isSelected = selectedUserIds.includes(profile.userId);
                  return (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary">
                          {profile.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground">
                              {profile.fullName || profile.username}
                            </span>
                            {(profile.accountType === "BUSINESS" || profile.businessName) && (
                              <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                                <Sparkles className="w-2 h-2" />
                                Business
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            @{profile.username}
                            {profile.businessName ? ` • ${profile.businessName}` : ""}
                          </span>
                        </div>
                      </div>

                      {isGroupMode ? (
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(profile.userId)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-secondary text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isCreatingChat}
                          onClick={() => handleCreateDirectChat(profile.userId)}
                          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all disabled:opacity-50"
                        >
                          Chat
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {isGroupMode && (
              <div className="pt-4 border-t border-border/50 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsGroupMode(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!groupName.trim() || selectedUserIds.length === 0 || isCreatingChat}
                  onClick={handleCreateGroupChat}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {isCreatingChat ? "Creating..." : `Create Group (${selectedUserIds.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="relative max-w-sm w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[600px]">
            {/* Story Top Bar with Progress */}
            <div className="absolute top-0 inset-x-0 p-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary w-full animate-[progress_5s_linear]" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-white">
                    {activeStory.user?.profile?.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="font-semibold text-sm text-white drop-shadow">
                    {activeStory.user?.profile?.username || "User"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveStory(null)}
                  className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Story Media */}
            <div className="flex-1 flex items-center justify-center bg-zinc-950">
              {activeStory.mediaUrl && activeStory.mediaUrl.match(/\.(mp4|webm|mov)/i) ? (
                <video
                  src={activeStory.mediaUrl}
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global WebRTC Audio & Video Calling Modal */}
      <CallModal />
    </div>
  );
}
