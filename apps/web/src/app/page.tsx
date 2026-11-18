"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  PhoneCall,
  Sparkles,
  Zap,
  ArrowRight,
  MessageSquare,
  Radio,
  EyeOff,
  Flame,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nexo_token") : null;
    if (token) {
      setIsAuthenticated(true);
      router.push("/chat");
    } else {
      setIsAuthenticated(false);
    }
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col relative overflow-hidden selection:bg-primary selection:text-white">
      {/* Background Animated Gradient Orbs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-tr from-primary/20 via-purple-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ring-1 ring-primary/40 shadow-lg shadow-primary/20">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              NEXO
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-primary/20 text-primary border border-primary/30">
              Protocol v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            E2EE Network Online
          </div>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center gap-2 active:scale-95"
          >
            Open NEXO
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-12 pb-24 flex flex-col items-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-xs font-medium text-zinc-300 mb-8"
        >
          <Shield className="w-4 h-4 text-primary" />
          <span>Zero-Knowledge Architecture &bull; Client-Side Cryptography</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6"
        >
          Hyper-secure, Realtime Communication for the{" "}
          <span className="bg-gradient-to-r from-primary via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Modern Web
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
        >
          End-to-end encrypted messaging, peer-to-peer WebRTC voice & video, ephemeral stories, and AI assistant summarization designed with absolute privacy at its core.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 flex items-center justify-center gap-3 group active:scale-95"
          >
            Launch NEXO Web
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl glass hover:bg-white/5 border border-zinc-800 text-foreground font-semibold text-base transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Lock className="w-4 h-4 text-primary" />
            Security & E2EE Specs
          </Link>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 text-left"
        >
          <div className="glass rounded-3xl p-8 border border-white/5 hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">End-to-End Encryption</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every message and media attachment is encrypted on device using Curve P-256 and AES-GCM 256. Private keys never leave your machine.
            </p>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
              <PhoneCall className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">WebRTC Voice & Video</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Crystal-clear peer-to-peer audio and video calls. Directly signaled over WebSockets with zero server interception.
            </p>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Chat Intelligence</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              On-demand thread summaries and smart replies powered by Google Gemini, helping you catch up without reading hundreds of missed messages.
            </p>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5 hover:border-emerald-500/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
              <Flame className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ephemeral Stories</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Share moments with friends that self-destruct after 24 hours. Directly stored in encrypted object storage.
            </p>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5 hover:border-amber-500/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
              <EyeOff className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Disappearing Messages</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Set custom TTL timers on sensitive conversations. BullMQ background workers securely shred expired message data.
            </p>
          </div>

          <div className="glass rounded-3xl p-8 border border-white/5 hover:border-rose-500/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 group-hover:bg-rose-500/20 transition-colors">
              <Zap className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multi-Platform Sync</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Seamlessly switch between Next.js Web and React Native Mobile with synchronized sessions and multi-device key exchange.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 text-center text-xs text-muted-foreground z-10">
        <p>&copy; 2026 NEXO Protocol. Security-first &bull; Privacy-first &bull; Realtime.</p>
      </footer>
    </div>
  );
}
