"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Package,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { createIdentityForPassword, getStoredIdentity, restoreIdentityForPassword } from "@/lib/crypto";

type AuthMode = "login" | "register";
type AccountType = "PERSONAL" | "BUSINESS";

const BUSINESS_CATEGORIES = [
  "E-Commerce & Retail",
  "Design, Creative & Media",
  "Software & Tech Services",
  "Consulting & Professional Services",
  "Education & Coaching",
  "Health & Wellness",
  "Restaurant & Hospitality",
  "Other Business",
];

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [accountType, setAccountType] = useState<AccountType>("PERSONAL");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Business-specific fields
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState(BUSINESS_CATEGORIES[0]);
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessUpiId, setBusinessUpiId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isRegistering = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isRegistering && password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("This password is too long. Use 72 bytes or fewer.");
      return;
    }
    if (isRegistering && accountType === "BUSINESS" && !businessName.trim()) {
      setError("Please provide your business or brand name.");
      return;
    }

    setIsLoading(true);

    try {
      const deviceName =
        typeof navigator === "undefined" ? "NEXO web" : navigator.userAgent.slice(0, 90);

      const payload: Record<string, any> = {
        email: email.trim().toLowerCase(),
        password,
        device: { platform: "web", deviceName },
      };

      if (isRegistering) {
        payload.fullName = fullName.trim() || undefined;
        payload.accountType = accountType;
        if (accountType === "BUSINESS") {
          payload.businessName = businessName.trim();
          payload.businessCategory = businessCategory;
          payload.businessDescription = businessDescription.trim() || undefined;
          payload.businessHours = businessHours.trim() || undefined;
          payload.businessWebsite = businessWebsite.trim() || undefined;
          payload.businessUpiId = businessUpiId.trim() || undefined;
        }
      }

      const response = await api.post(`/auth/${mode === "register" ? "register" : "login"}`, payload);

      const { accessToken, refreshToken } = response.data.tokens;
      if (!accessToken || !refreshToken) {
        throw new Error("The server returned an incomplete sign-in session.");
      }

      localStorage.setItem("nexo_token", accessToken);
      localStorage.setItem("nexo_refresh_token", refreshToken);

      const keyResponse = await api.get("/e2e/keys/me");
      const keyBundle = keyResponse.data;
      const hasServerBackup = Boolean(
        keyBundle?.identityKeyPublic &&
          keyBundle?.encryptedIdentityKeyBackup &&
          keyBundle?.identityKeyBackupSalt &&
          keyBundle?.identityKeyBackupIv,
      );
      const localIdentity = await getStoredIdentity(email.trim().toLowerCase());

      if (
        localIdentity &&
        (!hasServerBackup || localIdentity.identityKeyPublic === keyBundle.identityKeyPublic)
      ) {
        if (!hasServerBackup) {
          await api.post("/e2e/keys", {
            identityKeyPublic: localIdentity.identityKeyPublic,
            ...localIdentity.backup,
            preKeys: [],
          });
        }
      } else if (hasServerBackup) {
        await restoreIdentityForPassword(
          email.trim().toLowerCase(),
          password,
          keyBundle.identityKeyPublic,
          {
            encryptedIdentityKeyBackup: keyBundle.encryptedIdentityKeyBackup,
            identityKeyBackupSalt: keyBundle.identityKeyBackupSalt,
            identityKeyBackupIv: keyBundle.identityKeyBackupIv,
          },
        );
      } else {
        const created = await createIdentityForPassword(email.trim().toLowerCase(), password);
        await api.post("/e2e/keys", {
          identityKeyPublic: created.identity.identityKeyPublic,
          ...created.backup,
          preKeys: [],
        });
      }

      setAuth(response.data.user, accessToken);
      router.replace("/chat");
    } catch (requestError: unknown) {
      localStorage.removeItem("nexo_token");
      localStorage.removeItem("nexo_refresh_token");
      const responseMessage = (
        requestError as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      const message = Array.isArray(responseMessage) ? responseMessage.join(" ") : responseMessage;
      const isNetworkError = (requestError as { code?: string })?.code === "ERR_NETWORK";
      setError(
        message ||
          (isNetworkError
            ? `NEXO API is not reachable at ${api.defaults.baseURL}. Start the API and try again.`
            : requestError instanceof Error
              ? requestError.message
              : "Unable to connect. Try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#07090d] text-white selection:bg-cyan-300/30">
      {/* Background ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-cyan-500/[0.08] blur-[130px]" />
        <div className="absolute -bottom-64 -right-32 h-[40rem] w-[40rem] rounded-full bg-indigo-500/[0.11] blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-7xl items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_480px] lg:gap-16 lg:px-12">
        {/* Left Hero Section (hidden on mobile) */}
        <section className="hidden max-w-xl lg:block">
          <div className="mb-14 inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,.15)]">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-[0.2em] text-white">NEXO</span>
              <span className="text-[11px] font-mono tracking-wider text-cyan-300/70">
                COMMUNICATION & COMMERCE
              </span>
            </div>
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.8)] animate-pulse" />
            Personal E2EE & Business Suite
          </div>

          <h1 className="text-5xl font-semibold leading-[1.1] tracking-[-0.04em] xl:text-6xl">
            One platform,
            <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              limitless conversations.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
            Whether for private personal discussions with HD voice & video calls, or for growing your
            business with client chat, product listings, payment collection, and appointment booking.
          </p>

          <div className="mt-10 space-y-3.5">
            {[
              [
                ShieldCheck,
                "Personal End-to-End Encryption",
                "Direct messages and calls are encrypted with keys that stay on your devices.",
              ],
              [
                Building2,
                "Integrated Business Suite",
                "Showcase product listings, collect payments directly in chat, and schedule meetings.",
              ],
              [
                CreditCard,
                "In-Chat Payment Requests",
                "Send invoices and collect customer payments with instant verification and receipts.",
              ],
              [
                Calendar,
                "Client Meeting Scheduling",
                "Book video appointments and client consults directly through interactive chat cards.",
              ],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof ShieldCheck;
              return (
                <div
                  key={title as string}
                  className="flex items-start gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition hover:border-cyan-300/20 hover:bg-white/[0.04]"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-300/20">
                    <FeatureIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{title as string}</p>
                    <p className="mt-0.5 text-xs leading-5 text-zinc-500">{description as string}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex items-center gap-2 text-xs text-zinc-500">
            <Check className="h-4 w-4 text-emerald-400" />
            Instant switching between personal and business workflows anytime.
          </div>
        </section>

        {/* Right Form Card */}
        <section className="mx-auto w-full max-w-md">
          {/* Mobile brand header */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-200">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <span className="font-bold tracking-[0.2em] text-white">NEXO</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-300/70 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              Web Portal
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-[2rem] border border-white/[0.1] bg-[#0e1219]/95 p-6 shadow-[0_28px_100px_rgba(0,0,0,.6)] backdrop-blur-2xl sm:p-8"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
                {isRegistering ? "Get Started" : "Welcome Back"}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {isRegistering ? "Create your account" : "Sign in to NEXO"}
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 sm:text-sm">
                {isRegistering
                  ? "Choose your account type to customize your workspace."
                  : "Enter your credentials to access your chats and business suite."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/40 p-1">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchMode(tab)}
                  className={`relative rounded-lg py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                    mode === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-pressed={mode === tab}
                >
                  {mode === tab && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-0 rounded-lg border border-cyan-300/20 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 shadow-sm"
                    />
                  )}
                  <span className="relative">{tab === "login" ? "Sign In" : "Register"}</span>
                </button>
              ))}
            </div>

            {/* Account Type Selector (Only in Register mode) */}
            <AnimatePresence>
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 space-y-2 overflow-hidden"
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Select Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Personal Option */}
                    <button
                      type="button"
                      onClick={() => setAccountType("PERSONAL")}
                      className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${
                        accountType === "PERSONAL"
                          ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.12)] text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            accountType === "PERSONAL"
                              ? "bg-cyan-400/20 text-cyan-300"
                              : "bg-white/5 text-zinc-400"
                          }`}
                        >
                          <UserRound className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white">Personal</span>
                      </div>
                      <p className="text-[10px] leading-4 text-zinc-400">
                        E2EE chats, voice & video calls with friends & family.
                      </p>
                    </button>

                    {/* Business Option */}
                    <button
                      type="button"
                      onClick={() => setAccountType("BUSINESS")}
                      className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left ${
                        accountType === "BUSINESS"
                          ? "border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
                          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            accountType === "BUSINESS"
                              ? "bg-indigo-400/20 text-indigo-300"
                              : "bg-white/5 text-zinc-400"
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          Business
                          <Sparkles className="w-3 h-3 text-amber-300" />
                        </span>
                      </div>
                      <p className="text-[10px] leading-4 text-zinc-400">
                        Catalog listings, payment requests, appointments & CRM.
                      </p>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field in register */}
              <AnimatePresence initial={false}>
                {isRegistering && (
                  <motion.div
                    key="full-name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="h-11 w-full rounded-xl border border-white/[0.09] bg-black/30 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/[0.1]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Business-Specific Details (if accountType === 'BUSINESS' and registering) */}
              <AnimatePresence>
                {isRegistering && accountType === "BUSINESS" && (
                  <motion.div
                    key="business-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3.5 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.04] p-3.5 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-semibold">
                      <Briefcase className="w-3.5 h-3.5" />
                      Business Profile Details
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Business / Brand Name *
                      </label>
                      <input
                        type="text"
                        required={accountType === "BUSINESS"}
                        maxLength={100}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Apex Creative Agency"
                        className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/40 px-3 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-400/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Category
                        </label>
                        <select
                          value={businessCategory}
                          onChange={(e) => setBusinessCategory(e.target.value)}
                          className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#121620] px-2.5 text-xs text-zinc-200 outline-none focus:border-indigo-400/50"
                        >
                          {BUSINESS_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Business Hours
                        </label>
                        <input
                          type="text"
                          maxLength={80}
                          value={businessHours}
                          onChange={(e) => setBusinessHours(e.target.value)}
                          placeholder="e.g. 9 AM - 6 PM"
                          className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/40 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Description / Services
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        placeholder="Brief summary of your products or services..."
                        className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/40 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Website / URL
                        </label>
                        <input
                          type="text"
                          value={businessWebsite}
                          onChange={(e) => setBusinessWebsite(e.target.value)}
                          placeholder="https://mybiz.com"
                          className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/40 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          UPI ID / Pay Handle
                        </label>
                        <input
                          type="text"
                          value={businessUpiId}
                          onChange={(e) => setBusinessUpiId(e.target.value)}
                          placeholder="merchant@upi"
                          className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/40 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-indigo-400/50"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-black/30 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/[0.1]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  {isRegistering && (
                    <span className="text-[11px] text-zinc-500">Min 12 characters</span>
                  )}
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    required
                    minLength={isRegistering ? 12 : 1}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegistering ? "Create a strong password" : "••••••••••••"}
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-black/30 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/[0.1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3.5 py-2.5 text-xs text-rose-200 leading-relaxed"
                >
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 px-4 text-xs font-bold uppercase tracking-wider text-[#071116] shadow-[0_8px_30px_rgba(34,211,238,.2)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                ) : (
                  <>
                    <span>
                      {isRegistering
                        ? accountType === "BUSINESS"
                          ? "Launch Business Account"
                          : "Create Personal Account"
                        : "Sign In to NEXO"}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-[11px] leading-5 text-zinc-500">
              By accessing NEXO, you agree to our standard platform terms & privacy protections.
            </p>
          </motion.div>

          <p className="mt-5 text-center text-[11px] text-zinc-600 font-mono">
            NEXO E2EE & Business Suite · Web Platform
          </p>
        </section>
      </div>
    </main>
  );
}
