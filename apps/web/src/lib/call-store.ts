import { create } from 'zustand';
import { getSocket } from './socket';
import { api } from './api';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'incoming' | 'ringing' | 'connected';

export interface CallerInfo {
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  businessName?: string;
}

interface CallStoreState {
  callStatus: CallStatus;
  callType: CallType;
  chatId: string | null;
  targetUserId: string | null;
  callerInfo: CallerInfo | null;
  chatDisplayName: string;
  callId: string | null;
  callDuration: number;
  isMuted: boolean;
  isVideoDisabled: boolean;
  isScreenSharing: boolean;

  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Actions
  initSocketListeners: (currentUserId: string) => () => void;
  startCall: (params: {
    targetUserId: string;
    chatId: string;
    callType: CallType;
    chatDisplayName: string;
    currentUser: { username?: string; fullName?: string; avatarUrl?: string; businessName?: string };
  }) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;

  attachAudioElement: (el: HTMLAudioElement | null) => void;
  attachLocalVideo: (el: HTMLVideoElement | null) => void;
  attachRemoteVideo: (el: HTMLVideoElement | null) => void;
}

let pc: RTCPeerConnection | null = null;
let pendingOfferSignal: any = null;
let pendingIceCandidates: RTCIceCandidateInit[] = [];
let localStreamRef: MediaStream | null = null;
let remoteStreamRef: MediaStream | null = null;
let screenTrackRef: MediaStreamTrack | null = null;
let audioElementRef: HTMLAudioElement | null = null;
let localVideoElementRef: HTMLVideoElement | null = null;
let remoteVideoElementRef: HTMLVideoElement | null = null;
let durationTimer: NodeJS.Timeout | null = null;

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

function syncMediaElements() {
  if (audioElementRef && remoteStreamRef) {
    if (audioElementRef.srcObject !== remoteStreamRef) {
      audioElementRef.srcObject = remoteStreamRef;
    }
    audioElementRef.play().catch(() => {});
  }
  if (remoteVideoElementRef && remoteStreamRef) {
    if (remoteVideoElementRef.srcObject !== remoteStreamRef) {
      remoteVideoElementRef.srcObject = remoteStreamRef;
    }
    remoteVideoElementRef.play().catch(() => {});
  }
  if (localVideoElementRef && localStreamRef) {
    if (localVideoElementRef.srcObject !== localStreamRef) {
      localVideoElementRef.srcObject = localStreamRef;
    }
    localVideoElementRef.play().catch(() => {});
  }
}

function cleanupWebRTC() {
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
  if (screenTrackRef) {
    screenTrackRef.stop();
    screenTrackRef = null;
  }
  if (localStreamRef) {
    localStreamRef.getTracks().forEach((t) => t.stop());
    localStreamRef = null;
  }
  if (pc) {
    pc.close();
    pc = null;
  }
  pendingOfferSignal = null;
  pendingIceCandidates = [];
  remoteStreamRef = null;

  if (audioElementRef) audioElementRef.srcObject = null;
  if (localVideoElementRef) localVideoElementRef.srcObject = null;
  if (remoteVideoElementRef) remoteVideoElementRef.srcObject = null;
}

const loggedCallIds = new Set<string>();

async function recordCallLog(
  chatId: string | null,
  logData: {
    callType: CallType;
    status: 'completed' | 'missed' | 'declined';
    duration: number;
    callId?: string | null;
  }
) {
  if (!chatId) return;
  const key = logData.callId ? `${logData.callId}-${logData.status}` : `${chatId}-${Math.floor(Date.now() / 5000)}`;
  if (loggedCallIds.has(key)) return;
  loggedCallIds.add(key);

  try {
    const payload = {
      content: `CALL_LOG:${JSON.stringify({
        callType: logData.callType,
        status: logData.status,
        duration: logData.duration,
        timestamp: new Date().toISOString(),
      })}`,
      isEncrypted: false,
    };
    await api.post(`/chats/${chatId}/messages`, payload);
  } catch (err) {
    console.error('Failed to record call log in chat:', err);
  }
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  callStatus: 'idle',
  callType: 'video',
  chatId: null,
  targetUserId: null,
  callerInfo: null,
  chatDisplayName: '',
  callId: null,
  callDuration: 0,
  isMuted: false,
  isVideoDisabled: false,
  isScreenSharing: false,
  localStream: null,
  remoteStream: null,

  attachAudioElement: (el) => {
    audioElementRef = el;
    syncMediaElements();
  },

  attachLocalVideo: (el) => {
    localVideoElementRef = el;
    syncMediaElements();
  },

  attachRemoteVideo: (el) => {
    remoteVideoElementRef = el;
    syncMediaElements();
  },

  initSocketListeners: (currentUserId: string) => {
    const socket = getSocket();

    const handleWebRTCSignal = async (data: {
      fromUserId: string;
      signal: any;
      callType?: CallType;
      chatId?: string;
      callerInfo?: CallerInfo;
      callId?: string;
    }) => {
      const { signal, fromUserId, callType = 'video', chatId, callerInfo, callId } = data;
      const state = get();

      try {
        if (signal?.type === 'offer') {
          // If already in a call, reject
          if (state.callStatus === 'connected' || state.callStatus === 'ringing') {
            socket.emit('webrtc_signal', {
              targetUserId: fromUserId,
              signal: { type: 'reject', reason: 'busy' },
            });
            return;
          }

          // Buffer the offer
          pendingOfferSignal = signal;
          pendingIceCandidates = [];

          set({
            callStatus: 'incoming',
            callType,
            chatId: chatId || null,
            targetUserId: fromUserId,
            callerInfo: callerInfo || null,
            chatDisplayName: callerInfo?.fullName || callerInfo?.username || 'Incoming Call',
            callId: callId || null,
            callDuration: 0,
          });
        } else if (signal?.type === 'answer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            // Flush buffered candidates
            while (pendingIceCandidates.length > 0) {
              const c = pendingIceCandidates.shift();
              if (c) {
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
            }

            if (!durationTimer) {
              durationTimer = setInterval(() => {
                set((prev) => ({ callDuration: prev.callDuration + 1 }));
              }, 1000);
            }

            set({ callStatus: 'connected' });
            syncMediaElements();
          }
        } else if (signal?.candidate) {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            pendingIceCandidates.push(signal.candidate);
          }
        } else if (signal?.type === 'reject') {
          const { chatId: currChatId, callType: currCallType, callId: currCallId } = get();
          if (currChatId) {
            recordCallLog(currChatId, { callType: currCallType, status: 'declined', duration: 0, callId: currCallId });
          }
          cleanupWebRTC();
          set({
            callStatus: 'idle',
            localStream: null,
            remoteStream: null,
            callId: null,
          });
        } else if (signal?.type === 'end_call') {
          const { chatId: currChatId, callType: currCallType, callDuration: currDur, callStatus: currStatus, callId: currCallId } = get();
          if (currChatId) {
            const status = currStatus === 'connected' ? 'completed' : 'missed';
            recordCallLog(currChatId, {
              callType: currCallType,
              status,
              duration: status === 'completed' ? currDur : 0,
              callId: currCallId,
            });
          }
          cleanupWebRTC();
          set({
            callStatus: 'idle',
            localStream: null,
            remoteStream: null,
            callId: null,
          });
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    };

    socket.on('webrtc_signal', handleWebRTCSignal);

    return () => {
      socket.off('webrtc_signal', handleWebRTCSignal);
    };
  },

  startCall: async ({ targetUserId, chatId, callType, chatDisplayName, currentUser }) => {
    cleanupWebRTC();

    set({
      callStatus: 'ringing',
      callType,
      chatId,
      targetUserId,
      chatDisplayName,
      callDuration: 0,
      isMuted: false,
      isVideoDisabled: false,
      isScreenSharing: false,
      localStream: null,
      remoteStream: null,
    });

    try {
      // Get ice servers
      const iceServers = await api
        .get('/calls/ice-servers')
        .then((r) => r.data)
        .catch(() => DEFAULT_ICE_SERVERS);

      const newPc = new RTCPeerConnection({ iceServers });
      pc = newPc;

      // Start call record in backend
      const callRecord = await api
        .post('/calls', { chatId })
        .then((r) => r.data)
        .catch(() => ({ id: `call-${Date.now()}` }));
      set({ callId: callRecord.id });

      // Request media stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
      } catch {
        // Fallback to audio only if video failed
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        set({ callType: 'audio' });
      }

      localStreamRef = stream;
      set({ localStream: stream });
      stream.getTracks().forEach((track) => newPc.addTrack(track, stream));

      newPc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef = event.streams[0];
          set({ remoteStream: event.streams[0], callStatus: 'connected' });
          syncMediaElements();
          if (!durationTimer) {
            durationTimer = setInterval(() => {
              set((prev) => ({ callDuration: prev.callDuration + 1 }));
            }, 1000);
          }
        }
      };

      const socket = getSocket();
      newPc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            targetUserId,
            signal: { candidate: event.candidate },
          });
        }
      };

      const offer = await newPc.createOffer();
      await newPc.setLocalDescription(offer);

      socket.emit('webrtc_signal', {
        targetUserId,
        signal: offer,
        callType,
        chatId,
        callerInfo: {
          username: currentUser.username,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl,
          businessName: currentUser.businessName,
        },
        callId: callRecord.id,
      });

      syncMediaElements();
    } catch (err) {
      console.error('Failed to start call:', err);
      get().endCall();
    }
  },

  answerCall: async () => {
    const { targetUserId, callType, chatId, callId } = get();
    if (!targetUserId || !pendingOfferSignal) {
      console.error('Cannot answer: missing offer or target user');
      return;
    }

    const offerSignal = pendingOfferSignal;
    set({ callStatus: 'connected', callDuration: 0 });

    try {
      const iceServers = await api
        .get('/calls/ice-servers')
        .then((r) => r.data)
        .catch(() => DEFAULT_ICE_SERVERS);

      const newPc = new RTCPeerConnection({ iceServers });
      pc = newPc;

      // Request media stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        set({ callType: 'audio' });
      }

      localStreamRef = stream;
      set({ localStream: stream });
      stream.getTracks().forEach((track) => newPc.addTrack(track, stream));

      newPc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef = event.streams[0];
          set({ remoteStream: event.streams[0], callStatus: 'connected' });
          syncMediaElements();
        }
      };

      const socket = getSocket();
      newPc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            targetUserId,
            signal: { candidate: event.candidate },
          });
        }
      };

      await newPc.setRemoteDescription(new RTCSessionDescription(offerSignal));

      // Flush candidates received before answer
      while (pendingIceCandidates.length > 0) {
        const c = pendingIceCandidates.shift();
        if (c) {
          await newPc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      }

      const answer = await newPc.createAnswer();
      await newPc.setLocalDescription(answer);

      socket.emit('webrtc_signal', {
        targetUserId,
        signal: answer,
        chatId,
        callId,
      });

      if (!durationTimer) {
        durationTimer = setInterval(() => {
          set((prev) => ({ callDuration: prev.callDuration + 1 }));
        }, 1000);
      }

      syncMediaElements();
    } catch (err) {
      console.error('Failed to answer call:', err);
      get().endCall();
    }
  },

  declineCall: () => {
    const { targetUserId, chatId, callType, callId } = get();
    if (targetUserId) {
      const socket = getSocket();
      socket.emit('webrtc_signal', {
        targetUserId,
        signal: { type: 'reject' },
      });
    }
    if (chatId) {
      recordCallLog(chatId, { callType, status: 'declined', duration: 0, callId });
    }
    cleanupWebRTC();
    set({
      callStatus: 'idle',
      targetUserId: null,
      callerInfo: null,
      chatId: null,
      localStream: null,
      remoteStream: null,
      callId: null,
    });
  },

  endCall: () => {
    const { targetUserId, callId, chatId, callType, callDuration, callStatus } = get();
    if (targetUserId) {
      const socket = getSocket();
      socket.emit('webrtc_signal', {
        targetUserId,
        signal: { type: 'end_call' },
      });
    }

    if (callId) {
      api.patch(`/calls/${callId}/end`).catch(() => {});
    }

    if (chatId) {
      const status = callStatus === 'connected' ? 'completed' : 'missed';
      recordCallLog(chatId, {
        callType,
        status,
        duration: status === 'completed' ? callDuration : 0,
        callId,
      });
    }

    cleanupWebRTC();
    set({
      callStatus: 'idle',
      targetUserId: null,
      callerInfo: null,
      chatId: null,
      localStream: null,
      remoteStream: null,
      callId: null,
      callDuration: 0,
      isMuted: false,
      isVideoDisabled: false,
      isScreenSharing: false,
    });
  },

  toggleMute: () => {
    if (localStreamRef) {
      const audioTrack = localStreamRef.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        set({ isMuted: !audioTrack.enabled });
      }
    }
  },

  toggleVideo: () => {
    if (localStreamRef) {
      const videoTrack = localStreamRef.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        set({ isVideoDisabled: !videoTrack.enabled });
      }
    }
  },

  toggleScreenShare: async () => {
    const { isScreenSharing, targetUserId } = get();
    if (!pc || !localStreamRef) return;

    if (isScreenSharing) {
      // Revert to camera
      if (screenTrackRef) {
        screenTrackRef.stop();
        screenTrackRef = null;
      }

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const newVideoTrack = camStream.getVideoTracks()[0];

        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && newVideoTrack) {
          await sender.replaceTrack(newVideoTrack);
        }

        const oldVideoTrack = localStreamRef.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.addTrack(newVideoTrack);
        set({ isScreenSharing: false, localStream: localStreamRef });
        syncMediaElements();
      } catch (err) {
        console.error('Failed to revert to camera:', err);
      }
    } else {
      // Start screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef = screenTrack;

        screenTrack.onended = () => {
          get().toggleScreenShare();
        };

        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        const oldVideoTrack = localStreamRef.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.removeTrack(oldVideoTrack);
        }
        localStreamRef.addTrack(screenTrack);
        set({ isScreenSharing: true, localStream: localStreamRef });
        syncMediaElements();
      } catch (err) {
        console.error('Failed to start screen share:', err);
      }
    }
  },
}));
