"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  User,
  Shield,
  KeyRound,
  Eye,
  Loader2,
  Check,
  Camera,
  Save,
  AlertCircle,
  ArrowLeft,
  Building2,
  Briefcase,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "privacy" | "security" | "business">("profile");

  // Profile state
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Business state
  const [accountType, setAccountType] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("General Business");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessUpiId, setBusinessUpiId] = useState("");

  // Privacy state
  const [lastSeen, setLastSeen] = useState<"EVERYONE" | "CONTACTS" | "NOBODY">("EVERYONE");
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState<
    "EVERYONE" | "CONTACTS" | "NOBODY"
  >("EVERYONE");
  const [readReceipts, setReadReceipts] = useState(true);

  // Security / PIN state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Loading & notification states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, privacyRes] = await Promise.all([
          api.get("/profiles/me").catch(() => null),
          api.get("/privacy").catch(() => null),
        ]);

        if (profileRes?.data) {
          setUsername(profileRes.data.username || "");
          setFullName(profileRes.data.fullName || "");
          setBio(profileRes.data.bio || "");
          setAvatarUrl(profileRes.data.avatarUrl || "");
          setAccountType(profileRes.data.accountType || "PERSONAL");
          setBusinessName(profileRes.data.businessName || "");
          setBusinessCategory(profileRes.data.businessCategory || "General Business");
          setBusinessDescription(profileRes.data.businessDescription || "");
          setBusinessHours(profileRes.data.businessHours || "");
          setBusinessWebsite(profileRes.data.businessWebsite || "");
          setBusinessUpiId(profileRes.data.businessUpiId || "");
        }

        if (privacyRes?.data) {
          setLastSeen(privacyRes.data.lastSeen || "EVERYONE");
          setProfilePhotoVisibility(privacyRes.data.profilePhotoVisibility || "EVERYONE");
          setReadReceipts(
            privacyRes.data.readReceipts !== undefined ? privacyRes.data.readReceipts : true
          );
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { data: presigned } = await api.get("/media/presigned-url", {
        params: {
          filename: `avatar-${Date.now()}-${file.name}`,
          contentType: file.type || "application/octet-stream",
        },
      });

      await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setAvatarUrl(presigned.fileUrl);
      setFeedback({ type: "success", message: "Avatar uploaded! Click save to apply." });
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setFeedback({ type: "error", message: "Avatar upload failed." });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      await api.put("/profiles/me", {
        username: username.trim(),
        fullName: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setFeedback({ type: "success", message: "Profile updated successfully!" });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      await api.put("/privacy", {
        lastSeen,
        profilePhotoVisibility,
        readReceipts,
      });
      setFeedback({ type: "success", message: "Privacy preferences saved!" });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update privacy settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setFeedback({ type: "error", message: "PIN must be exactly 6 numeric digits." });
      return;
    }
    if (pin !== confirmPin) {
      setFeedback({ type: "error", message: "PINs do not match." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      await api.post("/users/pin", { pin });
      setFeedback({ type: "success", message: "6-digit security PIN set successfully!" });
      setPin("");
      setConfirmPin("");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to configure PIN.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      await api.put("/profiles/me", {
        accountType,
        businessName: businessName.trim() || undefined,
        businessCategory: businessCategory.trim() || undefined,
        businessDescription: businessDescription.trim() || undefined,
        businessHours: businessHours.trim() || undefined,
        businessWebsite: businessWebsite.trim() || undefined,
        businessUpiId: businessUpiId.trim() || undefined,
      });
      useAuthStore.getState().updateUser({
        accountType,
        businessName,
        businessCategory,
        businessDescription,
        businessHours,
        businessWebsite,
        businessUpiId,
      });
      setFeedback({ type: "success", message: "Business profile and mode updated successfully!" });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update business profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="p-2 rounded-xl glass hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Account & Privacy</h1>
            <p className="text-xs text-muted-foreground">
              Manage your NEXO identity, business store, security keys, and confidentiality rules
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1.5 glass rounded-2xl border border-white/5 max-w-xl overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("profile");
            setFeedback(null);
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === "profile"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        <button
          onClick={() => {
            setActiveTab("business");
            setFeedback(null);
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === "business"
              ? "bg-cyan-400 text-black shadow-md shadow-cyan-400/20 font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4 text-cyan-400" />
          Business
        </button>
        <button
          onClick={() => {
            setActiveTab("privacy");
            setFeedback(null);
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === "privacy"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="w-4 h-4" />
          Privacy
        </button>
        <button
          onClick={() => {
            setActiveTab("security");
            setFeedback(null);
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === "security"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Shield className="w-4 h-4" />
          PIN
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={cn(
            "mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm border",
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          )}
        >
          {feedback.type === "success" ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Profile Form */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
          {/* Avatar Picker */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-secondary/80 border border-white/10 flex items-center justify-center overflow-hidden text-2xl font-bold text-primary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  username.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Profile Photo</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                PNG, JPG or WebP. Encrypted storage on MinIO.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A few words about yourself..."
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        </form>
      )}

      {/* Privacy Form */}
      {activeTab === "privacy" && (
        <form onSubmit={handleSavePrivacy} className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Last Seen Visibility
            </label>
            <select
              value={lastSeen}
              onChange={(e) => setLastSeen(e.target.value as any)}
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="EVERYONE">Everyone</option>
              <option value="CONTACTS">Contacts Only</option>
              <option value="NOBODY">Nobody</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Controls who can see your online status and last active timestamp.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Profile Photo Visibility
            </label>
            <select
              value={profilePhotoVisibility}
              onChange={(e) => setProfilePhotoVisibility(e.target.value as any)}
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="EVERYONE">Everyone</option>
              <option value="CONTACTS">Contacts Only</option>
              <option value="NOBODY">Nobody</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 glass rounded-2xl border border-white/5">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Read Receipts</h4>
              <p className="text-xs text-muted-foreground">
                If turned off, you won&apos;t send or receive read receipts.
              </p>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Privacy Settings
            </button>
          </div>
        </form>
      )}

      {/* Security PIN Form */}
      {activeTab === "security" && (
        <form onSubmit={handleSetPin} className="space-y-6 max-w-xl">
          <div className="p-4 glass rounded-2xl border border-white/5 flex gap-3.5">
            <KeyRound className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">6-Digit Security PIN</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Your PIN secures biometric fallback, device registration, and sensitive key recoveries.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              New 6-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-center text-xl tracking-widest font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Confirm 6-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-center text-xl tracking-widest font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || pin.length !== 6 || confirmPin.length !== 6}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Set Security PIN
            </button>
          </div>
        </form>
      )}

      {/* Business Account Mode Form */}
      {activeTab === "business" && (
        <form onSubmit={handleSaveBusiness} className="space-y-6 max-w-xl">
          <div className="p-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.04] flex gap-3.5">
            <Building2 className="w-5 h-5 text-cyan-300 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                NEXO Business & Commerce Profile
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                Activate business mode to showcase products, collect payments in chat, and schedule client
                consultations.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account Operating Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("PERSONAL")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  accountType === "PERSONAL"
                    ? "border-primary bg-primary/10 text-white font-semibold"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"
                )}
              >
                <div className="text-xs font-bold">Personal Account</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Private chat & calls</div>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("BUSINESS")}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  accountType === "BUSINESS"
                    ? "border-cyan-400 bg-cyan-500/10 text-white font-semibold shadow-sm"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"
                )}
              >
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  Business Mode <Sparkles className="w-3 h-3" />
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Storefront, CRM & invoicing</div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Business / Store Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Design Studio"
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Industry Category
            </label>
            <input
              type="text"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              placeholder="e.g. Consulting, Digital Products, Agency"
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Business Bio / Services
            </label>
            <textarea
              rows={3}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Tell your clients what you offer..."
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Operating Hours
              </label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="e.g. 9 AM - 6 PM"
                className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                UPI / Payment Handle
              </label>
              <input
                type="text"
                value={businessUpiId}
                onChange={(e) => setBusinessUpiId(e.target.value)}
                placeholder="e.g. store@upi"
                className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Website / Portfolio URL
            </label>
            <input
              type="url"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-input/60 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm shadow-md shadow-cyan-400/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Business Profile
            </button>

            {accountType === "BUSINESS" && (
              <Link
                href="/business"
                className="px-5 py-3 rounded-xl border border-white/10 hover:border-cyan-400/40 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4 text-cyan-300" />
                Go to Business Suite
              </Link>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
