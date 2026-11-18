"use client";

import React, { useEffect, useRef } from "react";
import { useCallStore } from "@/lib/call-store";
import {
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CallModal() {
  const {
    callStatus,
    callType,
    callerInfo,
    chatDisplayName,
    callDuration,
    isMuted,
    isVideoDisabled,
    isScreenSharing,
    localStream,
    remoteStream,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    attachAudioElement,
    attachLocalVideo,
    attachRemoteVideo,
  } = useCallStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind audio element to call store
  useEffect(() => {
    attachAudioElement(audioRef.current);
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(() => {});
    }
  }, [attachAudioElement, remoteStream]);

  // Bind video elements to call store
  useEffect(() => {
    attachLocalVideo(localVideoRef.current);
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [attachLocalVideo, localStream]);

  useEffect(() => {
    attachRemoteVideo(remoteVideoRef.current);
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [attachRemoteVideo, remoteStream]);

  if (callStatus === "idle") {
    return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
  }

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const displayName =
    chatDisplayName || callerInfo?.fullName || callerInfo?.username || "NEXO User";

  return (
    <>
      {/* Remote Audio Track Player - ALWAYS mounted */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* 1. Incoming Call Prompt */}
      {callStatus === "incoming" && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#10141d] border border-cyan-400/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center shadow-[0_0_60px_rgba(34,211,238,0.25)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

            {/* Caller Avatar */}
            <div className="relative mb-5">
              <div className="w-24 h-24 rounded-full bg-cyan-400/20 border-2 border-cyan-400/60 flex items-center justify-center text-2xl font-bold text-white shadow-lg animate-pulse">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-md">
                {callType === "video" ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 justify-center">
              <h3 className="text-xl font-bold text-white">{displayName}</h3>
              {callerInfo?.businessName && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Business
                </span>
              )}
            </div>

            {callerInfo?.businessName && (
              <p className="text-xs text-zinc-400 mt-0.5">{callerInfo.businessName}</p>
            )}

            <p className="text-xs text-cyan-300 font-medium mt-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              Incoming {callType === "video" ? "Video" : "Voice"} Call...
            </p>

            <div className="flex items-center gap-8 mt-8">
              <button
                type="button"
                onClick={declineCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-transform active:scale-95"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={answerCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-transform active:scale-95 animate-bounce"
                title="Accept"
              >
                {callType === "video" ? (
                  <Video className="w-6 h-6 text-black" />
                ) : (
                  <Phone className="w-6 h-6 text-black" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Call Modal (Ringing or Connected) */}
      {(callStatus === "ringing" || callStatus === "connected") && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in duration-200">
          {/* Top Bar Header */}
          <div className="flex flex-col items-center gap-1.5 z-20">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {displayName}
              </h2>
              {callerInfo?.businessName && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold">
                  {callerInfo.businessName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[11px] font-semibold capitalize px-3 py-0.5 rounded-full border",
                  callStatus === "connected"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-300 bg-amber-500/10 border-amber-500/20 animate-pulse"
                )}
              >
                {callStatus === "ringing" ? "Ringing..." : "Connected"}
              </span>

              {callStatus === "connected" && (
                <span className="text-[11px] font-mono text-zinc-400">
                  {formatDuration(callDuration)}
                </span>
              )}
            </div>
          </div>

          {/* Media Center Stage */}
          <div className="relative w-full max-w-4xl flex-1 my-4 sm:my-6 rounded-3xl overflow-hidden glass border border-white/10 flex items-center justify-center bg-zinc-950">
            {callType === "video" ? (
              <>
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-10">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isVideoDisabled && (
                    <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-xs text-zinc-400">
                      Camera Off
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Voice Call Visualization */
              <div className="flex flex-col items-center gap-6 z-10">
                <div className="relative">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-cyan-400/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-300 font-bold text-4xl sm:text-5xl shadow-[0_0_50px_rgba(34,211,238,0.3)] animate-pulse">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  {callStatus === "connected" && (
                    <span className="absolute -bottom-2 inset-x-0 mx-auto w-max px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-mono flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Voice Stream
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-sm font-semibold text-white">
                    {callStatus === "connected" ? "Call in progress" : "Connecting voice link..."}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    End-to-End Encrypted Voice
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls Toolbar */}
          <div className="flex items-center gap-3 sm:gap-6 pb-2 z-20">
            {/* Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95",
                isMuted
                  ? "bg-rose-500 text-white shadow-rose-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* Video Camera Toggle */}
            {callType === "video" && (
              <button
                type="button"
                onClick={toggleVideo}
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95",
                  isVideoDisabled
                    ? "bg-rose-500 text-white shadow-rose-500/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
                title={isVideoDisabled ? "Turn On Camera" : "Turn Off Camera"}
              >
                {isVideoDisabled ? (
                  <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Video className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            )}

            {/* Screen Share Toggle */}
            {callType === "video" && (
              <button
                type="button"
                onClick={toggleScreenShare}
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95",
                  isScreenSharing
                    ? "bg-cyan-400 text-black shadow-cyan-400/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 active:scale-95 transition-all"
              title="Hang Up"
            >
              <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
