import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { X, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UniversalMusicPlayer = () => {
  const { currentTrack, isPlayerVisible, setCurrentTrack } = useMusicPlayer();

  if (!isPlayerVisible || !currentTrack) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-elevated">
      <div className="flex items-center gap-3 px-3 py-2 max-w-2xl mx-auto">
        <img
          src={currentTrack.albumArt}
          alt={currentTrack.title}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentTrack.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Music className="h-4 w-4 text-primary animate-pulse" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentTrack(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="h-0 overflow-hidden">
        <iframe
          src={currentTrack.embedUrl}
          className="w-full"
          allow="autoplay; encrypted-media"
          title="Music Player"
        />
      </div>
    </div>
  );
};
