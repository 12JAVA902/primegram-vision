import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  platform: "deezer" | "youtube" | "spotify" | "apple";
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
});

export const useMusicPlayer = () => useContext(MusicPlayerContext);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
      // Auto-play next track from queue
      playNextFromQueue();
    });

    return () => {
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const playNextFromQueue = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIdx = queue.findIndex(t => t.id === currentTrack?.id);
    const nextIdx = currentIdx + 1;
    if (nextIdx < queue.length) {
      const next = queue[nextIdx];
      handleSetTrack(next);
    }
  }, [currentTrack, queue]);

  // Update the ended listener when queue/currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      if (queue.length > 0 && currentTrack) {
        const currentIdx = queue.findIndex(t => t.id === currentTrack.id);
        const nextIdx = currentIdx + 1;
        if (nextIdx < queue.length) {
          const next = queue[nextIdx];
          setTimeout(() => handleSetTrack(next), 300);
        }
      }
    };
    audio.removeEventListener("ended", onEnded);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [queue, currentTrack]);

  useEffect(() => {
    const tick = () => {
      if (audioRef.current && isPlaying) {
        setProgress(audioRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  const handleSetTrack = (track: Track | null) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!track) {
      audio.pause();
      audio.src = "";
      setCurrentTrackState(null);
      setIsPlaying(false);
      setProgress(0);
      return;
    }

    audio.src = track.previewUrl;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    setCurrentTrackState(track);
    setProgress(0);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const playNext = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIdx = queue.findIndex(t => t.id === currentTrack.id);
    const nextIdx = currentIdx + 1;
    if (nextIdx < queue.length) {
      handleSetTrack(queue[nextIdx]);
    }
  }, [currentTrack, queue]);

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
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};
