import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  platform: "youtube" | "deezer" | "spotify" | "apple";
  previewUrl: string; // YouTube video ID for youtube platform
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

// Load YouTube IFrame API
let ytApiReady = false;
let ytApiPromise: Promise<void> | null = null;

const loadYTApi = (): Promise<void> => {
  if (ytApiReady) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      ytApiReady = true;
      resolve();
      return;
    }
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
};

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number>(0);
  const pendingTrackRef = useRef<Track | null>(null);

  // Create hidden container for YT player
  useEffect(() => {
    const div = document.createElement("div");
    div.id = "yt-player-container";
    div.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(div);
    ytContainerRef.current = div;

    // Create inner div for player
    const inner = document.createElement("div");
    inner.id = "yt-player";
    div.appendChild(inner);

    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
      }
      clearInterval(timerRef.current);
      document.body.removeChild(div);
    };
  }, []);

  // Progress ticker
  useEffect(() => {
    if (isPlaying && ytPlayerRef.current) {
      timerRef.current = window.setInterval(() => {
        try {
          const p = ytPlayerRef.current;
          if (p && p.getCurrentTime) {
            setProgress(p.getCurrentTime());
            setDuration(p.getDuration());
          }
        } catch {}
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying]);

  const playNextFromQueue = useCallback(() => {
    const track = pendingTrackRef.current || currentTrack;
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === track.id);
    if (idx >= 0 && idx < queue.length - 1) {
      const next = queue[idx + 1];
      handleSetTrack(next);
    }
  }, [queue]); // currentTrack accessed via ref

  const initPlayer = useCallback(async (videoId: string) => {
    await loadYTApi();
    const YT = (window as any).YT;

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.loadVideoById(videoId);
        return;
      } catch {
        // Player broken, recreate
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    }

    // Recreate inner div
    const container = ytContainerRef.current;
    if (!container) return;
    let inner = document.getElementById("yt-player");
    if (inner) inner.remove();
    inner = document.createElement("div");
    inner.id = "yt-player";
    container.appendChild(inner);

    ytPlayerRef.current = new YT.Player("yt-player", {
      height: "1",
      width: "1",
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (e: any) => {
          e.target.playVideo();
          setIsPlaying(true);
        },
        onStateChange: (e: any) => {
          if (e.data === YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setDuration(e.target.getDuration());
          } else if (e.data === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (e.data === YT.PlayerState.ENDED) {
            setIsPlaying(false);
            setProgress(0);
            // Auto-play next
            playNextFromQueue();
          }
        },
        onError: () => {
          setIsPlaying(false);
          // Try next on error
          playNextFromQueue();
        },
      },
    });
  }, [playNextFromQueue]);

  const handleSetTrack = useCallback((track: Track | null) => {
    if (!track) {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.stopVideo(); } catch {}
      }
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

    if (track.platform === "youtube") {
      initPlayer(track.previewUrl);
    }
  }, [initPlayer]);

  const togglePlayPause = useCallback(() => {
    if (!currentTrack) return;
    const p = ytPlayerRef.current;
    if (!p) return;
    try {
      if (isPlaying) {
        p.pauseVideo();
        setIsPlaying(false);
      } else {
        p.playVideo();
        setIsPlaying(true);
      }
    } catch {}
  }, [currentTrack, isPlaying]);

  const playNext = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (idx >= 0 && idx < queue.length - 1) {
      handleSetTrack(queue[idx + 1]);
    }
  }, [currentTrack, queue, handleSetTrack]);

  const seekTo = useCallback((seconds: number) => {
    const p = ytPlayerRef.current;
    if (p && p.seekTo) {
      p.seekTo(seconds, true);
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
