import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { X, Music, Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const UniversalMusicPlayer = () => {
  const { currentTrack, isPlayerVisible, isPlaying, togglePlayPause, setCurrentTrack, progress, duration, playNext, queue } = useMusicPlayer();

  if (!isPlayerVisible || !currentTrack) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const currentIdx = queue.findIndex(t => t.id === currentTrack.id);
  const hasNext = currentIdx >= 0 && currentIdx < queue.length - 1;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-elevated">
      <Progress value={pct} className="h-1 rounded-none" />
      <div className="flex items-center gap-3 px-3 py-2 max-w-2xl mx-auto">
        {currentTrack.albumArt ? (
          <img
            src={currentTrack.albumArt}
            alt={currentTrack.title}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Music className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentTrack.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {hasNext && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext}>
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentTrack(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
