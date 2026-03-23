import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

interface UseWebRTCOptions {
  userId: string;
  remoteUserId: string;
  callType: "audio" | "video";
  onCallEnded?: () => void;
}

export function useWebRTC({ userId, remoteUserId, callType, onCallEnded }: UseWebRTCOptions) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    localStream.current?.getTracks().forEach((t) => t.stop());
    peerConnection.current?.close();
    peerConnection.current = null;
    localStream.current = null;
    remoteStream.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
    setCallDuration(0);
  }, []);

  const setupMediaStream = useCallback(async () => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === "video",
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, [callType]);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remote = new MediaStream();
      remoteStream.current = remote;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
      }

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remote.addTrack(track);
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate.toJSON(), from: userId },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setIsConnected(true);
          durationInterval.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        }
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          cleanup();
          onCallEnded?.();
        }
      };

      peerConnection.current = pc;
      return pc;
    },
    [userId, cleanup, onCallEnded]
  );

  const setupSignaling = useCallback(() => {
    const roomId = [userId, remoteUserId].sort().join("-");
    const channel = supabase.channel(`call-${roomId}`);

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        const pc = peerConnection.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { sdp: answer, from: userId },
        });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        const pc = peerConnection.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === userId) return;
        const pc = peerConnection.current;
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      })
      .on("broadcast", { event: "hangup" }, ({ payload }) => {
        if (payload.from === userId) return;
        cleanup();
        onCallEnded?.();
      })
      .subscribe();

    channelRef.current = channel;
    return channel;
  }, [userId, remoteUserId, cleanup, onCallEnded]);

  const startCall = useCallback(async () => {
    const stream = await setupMediaStream();
    const channel = setupSignaling();
    const pc = createPeerConnection(stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    channel.send({
      type: "broadcast",
      event: "offer",
      payload: { sdp: offer, from: userId },
    });
  }, [setupMediaStream, setupSignaling, createPeerConnection, userId]);

  const answerCall = useCallback(async () => {
    const stream = await setupMediaStream();
    setupSignaling();
    createPeerConnection(stream);
  }, [setupMediaStream, setupSignaling, createPeerConnection]);

  const hangup = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "hangup",
      payload: { from: userId },
    });
    cleanup();
    onCallEnded?.();
  }, [userId, cleanup, onCallEnded]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    isMuted,
    isVideoOff,
    callDuration,
    startCall,
    answerCall,
    hangup,
    toggleMute,
    toggleVideo,
  };
}
