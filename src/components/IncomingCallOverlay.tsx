import { useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, X, PhoneIncoming } from "lucide-react";

interface IncomingCallOverlayProps {
  callerName: string;
  callerAvatar?: string | null;
  callType: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallOverlay = ({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
}: IncomingCallOverlayProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0); // stop vibration
    }
  }, []);

  useEffect(() => {
    // Play ringtone - use a Web Audio API oscillator as fallback ringtone
    const playRingtone = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

        // Create a ringing pattern: beep on/off
        const ringPattern = () => {
          const now = audioCtx.currentTime;
          for (let i = 0; i < 10; i++) {
            gainNode.gain.setValueAtTime(0.3, now + i * 1.2);
            gainNode.gain.setValueAtTime(0, now + i * 1.2 + 0.6);
          }
        };

        oscillator.start();
        ringPattern();

        // Store cleanup reference
        audioRef.current = {
          pause: () => { oscillator.stop(); audioCtx.close(); },
          currentTime: 0,
        } as any;

        // Repeat ringing pattern
        const patternInterval = setInterval(ringPattern, 12000);
        const originalPause = audioRef.current!.pause;
        audioRef.current!.pause = () => {
          clearInterval(patternInterval);
          originalPause();
        };
      } catch (e) {
        console.warn("Could not play ringtone:", e);
      }
    };

    playRingtone();

    // Vibration pattern: [500ms vibrate, 200ms pause, 500ms vibrate]
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500]);
      vibrationRef.current = setInterval(() => {
        navigator.vibrate([500, 200, 500]);
      }, 1500);
    }

    return () => stopRinging();
  }, [stopRinging]);

  const handleAccept = () => {
    stopRinging();
    onAccept();
  };

  const handleDecline = () => {
    stopRinging();
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Pulsing ring effect */}
      <div className="relative mb-8">
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/20 animate-ping" />
        <div className="absolute inset-0 -m-2 rounded-full bg-primary/10 animate-pulse" />
        <Avatar className="w-32 h-32 border-4 border-primary/50 relative z-10">
          <AvatarImage src={callerAvatar || undefined} />
          <AvatarFallback className="text-5xl bg-primary/20 text-primary-foreground">
            {callerName?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Caller info */}
      <div className="text-center mb-2">
        <p className="text-white text-3xl font-bold">{callerName}</p>
      </div>
      <div className="flex items-center gap-2 mb-12">
        <PhoneIncoming className="h-5 w-5 text-green-400 animate-pulse" />
        <p className="text-white/70 text-lg capitalize">Incoming {callType} call</p>
      </div>

      {/* Accept / Decline buttons */}
      <div className="flex gap-16 items-center">
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            className="h-20 w-20 rounded-full shadow-lg shadow-destructive/30"
            onClick={handleDecline}
          >
            <X className="h-10 w-10" />
          </Button>
          <span className="text-white/60 text-sm">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button
            size="icon"
            className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
            onClick={handleAccept}
          >
            <Phone className="h-10 w-10" />
          </Button>
          <span className="text-white/60 text-sm">Accept</span>
        </div>
      </div>
    </div>
  );
};
