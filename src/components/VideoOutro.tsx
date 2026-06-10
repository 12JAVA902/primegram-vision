import { useEffect, useRef, useState } from "react";
import primegramLogo from "@/assets/primegram-logo.png";

/**
 * Wraps a <video> element ref and shows a Primegram outro
 * (logo + chime) when playback ends. Returns the overlay JSX
 * that should be rendered as an absolutely-positioned sibling.
 */
export const useVideoOutro = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [showOutro, setShowOutro] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } catch {}
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      setShowOutro(true);
      playChime();
      setTimeout(() => setShowOutro(false), 2200);
    };
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [videoRef]);

  const overlay = showOutro ? (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none">
      <img
        src={primegramLogo}
        alt="Primegram"
        className="h-20 w-20 rounded-2xl shadow-2xl animate-pulse"
      />
      <span className="mt-3 text-2xl font-bold bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] bg-clip-text text-transparent">
        Primegram
      </span>
    </div>
  ) : null;

  return { overlay };
};
