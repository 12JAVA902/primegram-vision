import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { X, Music, Play, Pause, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

export const UniversalMusicPlayer = () => {
  const { 
    currentTrack, 
    isPlayerVisible, 
    isPlaying, 
    togglePlayPause, 
    setCurrentTrack, 
    progress, 
    duration, 
    playNext, 
    queue, 
    seekTo,
    volume,
    setVolume
  } = useMusicPlayer();
  
  const [showVolume, setShowVolume] = useState(false);

  if (!isPlayerVisible || !currentTrack) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const currentIdx = queue.findIndex(t => t.id === currentTrack.id);
  const hasNext = currentIdx >= 0 && currentIdx < queue.length - 1;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 liquid-glass-card border-t border-white/10">
      {/* Progress Bar - clickable */}
      <div
        className="h-1.5 bg-white/10 cursor-pointer relative group"
        onClick={(e) => {
          if (duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pctClick = x / rect.width;
          seekTo(pctClick * duration);
        }}
      >
        <div 
          className="h-full bg-gradient-to-r from-[#FF00FF] to-[#2D004F] transition-all relative" 
          style={{ width: `${pct}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
        {/* Album Art */}
        {currentTrack.albumArt ? (
          <img
            src={currentTrack.albumArt}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-lg"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF00FF]/30 to-[#2D004F]/30 flex items-center justify-center flex-shrink-0">
            <Music className="h-6 w-6 text-[#FF00FF]" />
          </div>
        )}
        
        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-white">{currentTrack.title}</p>
          <p className="text-xs text-white/60 truncate">
            {currentTrack.artist}
            {duration > 0 && ` • ${formatTime(progress)} / ${formatTime(duration)}`}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Volume Control */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-white/10" 
              onClick={() => setShowVolume(!showVolume)}
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-white/80" />
              ) : (
                <Volume2 className="h-4 w-4 text-white/80" />
              )}
            </Button>
            
            {showVolume && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-xl liquid-glass-card min-w-[140px]">
                <Slider
                  value={[volume]}
                  onValueChange={([v]) => setVolume(v)}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-[10px] text-white/50 text-center mt-1">{volume}%</p>
              </div>
            )}
          </div>
          
          {/* Play/Pause */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full bg-gradient-to-r from-[#FF00FF] to-[#2D004F] hover:opacity-90" 
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
          </Button>
          
          {/* Skip Next */}
          {hasNext && (
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10" onClick={playNext}>
              <SkipForward className="h-4 w-4 text-white/80" />
            </Button>
          )}
          
          {/* Close */}
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10" onClick={() => setCurrentTrack(null)}>
            <X className="h-4 w-4 text-white/80" />
          </Button>
        </div>
      </div>
    </div>
  );
};
