import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Send, MoreVertical, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface ReelCardProps {
  reel: {
    id: string;
    video_url: string;
    caption: string;
    views: number;
    profiles: {
      id: string;
      username: string;
      avatar_url: string;
    };
  };
  isActive?: boolean;
}

export const ReelCard = ({ reel, isActive }: ReelCardProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
        setPlaying(true);
      } else {
        videoRef.current.pause();
        setPlaying(false);
      }
    }
  }, [isActive]);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play();
        setPlaying(true);
      }
    }
  };

  const handleLike = async () => {
    if (!user) return;
    setLiked(!liked);
    toast.success(liked ? "Unliked" : "Liked!");
  };

  return (
    <div className="relative h-screen w-full bg-black snap-start snap-always">
      <video
        ref={videoRef}
        src={reel.video_url}
        className="h-full w-full object-contain"
        loop
        playsInline
        muted={muted}
        onClick={handleVideoClick}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

      {/* Top info */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${reel.profiles.id}`}>
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarImage src={reel.profiles.avatar_url} />
              <AvatarFallback className="bg-primary text-white">
                {reel.profiles.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link to={`/profile/${reel.profiles.id}`}>
            <span className="text-white font-semibold drop-shadow-lg">
              {reel.profiles.username}
            </span>
          </Link>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <p className="text-white text-sm mb-2 drop-shadow-lg line-clamp-3">
          {reel.caption}
        </p>
        <p className="text-white/80 text-xs drop-shadow-lg">
          {reel.views.toLocaleString()} views
        </p>
      </div>

      {/* Right side actions */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-6 z-10">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <Heart
              className={`h-7 w-7 ${
                liked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">
            {liked ? "1.2K" : "1.1K"}
          </span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">
            42
          </span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <Send className="h-7 w-7 text-white" />
          </div>
        </button>

        <button
          onClick={() => setMuted(!muted)}
          className="flex flex-col items-center gap-1"
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            {muted ? (
              <VolumeX className="h-7 w-7 text-white" />
            ) : (
              <Volume2 className="h-7 w-7 text-white" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
