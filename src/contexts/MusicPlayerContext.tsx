import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  platform: "youtube" | "deezer" | "spotify" | "apple" | "audius";
  previewUrl: string;
  embedUrl?: string;
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  isPlayerVisible: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  progress: number;
  duration: number;
  queue: Track[];
  setQueue: (tracks: Track[]) => void;
  playNext: () => void;
  seekTo: (seconds: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType>({
  currentTrack: null,
  setCurrentTrack: () => {},
  isPlayerVisible: false,
  isPlaying: false,
  togglePlayPause: () => {},
  progress: 0,
  duration: 0,
  queue: [],
  setQueue: () => {},
  playNext: () => {},
  seekTo: () => {},
});

export const useMusicPlayer = () => useContext(MusicPlayerContext);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number>(0);
  const pendingTrackRef = useRef<Track | null>(null);

  // Create a single reusable Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
      // Auto-play next
      playNextFromQueue();
    });
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration || 0);
    });
    audio.addEventListener("error", () => {
      setIsPlaying(false);
      playNextFromQueue();
    });

    return () => {
      audio.pause();
      audio.src = "";
      clearInterval(timerRef.current);
    };
  }, []);

  // Progress ticker
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      timerRef.current = window.setInterval(() => {
        const a = audioRef.current;
        if (a) {
          setProgress(a.currentTime);
          if (a.duration) setDuration(a.duration);
        }
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying]);

  const playNextFromQueue = useCallback(() => {
    const track = pendingTrackRef.current;
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === track.id);
    if (idx >= 0 && idx < queue.length - 1) {
      const next = queue[idx + 1];
      handleSetTrack(next);
    }
  }, [queue]);

  const handleSetTrack = useCallback((track: Track | null) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!track) {
      audio.pause();
      audio.src = "";
      setCurrentTrackState(null);
      pendingTrackRef.current = null;
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
      return;
    }

    setCurrentTrackState(track);
    pendingTrackRef.current = track;
    setProgress(0);

    audio.src = track.previewUrl;
    audio.play().catch(() => {});
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !pendingTrackRef.current) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    const track = pendingTrackRef.current;
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === track.id);
    if (idx >= 0 && idx < queue.length - 1) {
      handleSetTrack(queue[idx + 1]);
    }
  }, [queue, handleSetTrack]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = seconds;
      setProgress(seconds);
    }
  }, []);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        setCurrentTrack: handleSetTrack,
        isPlayerVisible: !!currentTrack,
        isPlaying,
        togglePlayPause,
        progress,
        duration,
        queue,
        setQueue,
        playNext,
        seekTo,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};
