import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Send, MoreVertical, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { CommentsSection } from "@/components/CommentsSection";
import { useVideoOutro } from "@/components/VideoOutro";

interface ReelCardProps {
  reel: {
    id: string;
    video_url: string;
    caption: string;
    views: number;
    likes_count?: number;
    comments_count?: number;
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
  const [likeCount, setLikeCount] = useState(reel.likes_count ?? 0);
  const [commentCount, setCommentCount] = useState(reel.comments_count ?? 0);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const { overlay: outroOverlay } = useVideoOutro(videoRef);

  useEffect(() => {
    let cancelled = false;
    const loadState = async () => {
      // Check whether current user liked this reel
      if (user) {
        const { data } = await supabase
          .from("likes")
          .select("id")
          .eq("post_id", reel.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setLiked(!!data);
      }
    };
    loadState();
    return () => {
      cancelled = true;
    };
  }, [user, reel.id]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
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
    if (!user) return toast.error("Sign in to like");
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) {
        await supabase.from("likes").delete().eq("post_id", reel.id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: reel.id, user_id: user.id });
      }
    } catch {
      // revert
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      toast.error("Failed to update like");
    }
  };

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  return (
    <div className="relative h-screen w-full bg-black snap-start snap-always">
      <video
        ref={videoRef}
        src={reel.video_url}
        className="h-full w-full object-contain"
        loop={false}
        playsInline
        muted={muted}
        preload="metadata"
        onClick={handleVideoClick}
        onLoadedData={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}
      {outroOverlay}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

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
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <div className="absolute bottom-20 left-4 right-20 z-10">
        <p className="text-white text-sm mb-2 drop-shadow-lg line-clamp-3">
          {reel.caption}
        </p>
        <p className="text-white/80 text-xs drop-shadow-lg">
          {reel.views?.toLocaleString() ?? 0} views
        </p>
      </div>

      <div className="absolute bottom-24 right-4 flex flex-col gap-6 z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <Heart className={`h-7 w-7 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">{fmt(likeCount)}</span>
        </button>

        <button className="flex flex-col items-center gap-1" onClick={() => setShowComments(!showComments)}>
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">{fmt(commentCount)}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <Send className="h-7 w-7 text-white" />
          </div>
        </button>

        <button onClick={() => setMuted(!muted)} className="flex flex-col items-center gap-1">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            {muted ? <VolumeX className="h-7 w-7 text-white" /> : <Volume2 className="h-7 w-7 text-white" />}
          </div>
        </button>
      </div>

      {showComments && (
        <div className="absolute bottom-20 left-0 right-0 z-20 bg-black/80 backdrop-blur-md rounded-t-2xl max-h-[50vh] overflow-y-auto">
          <CommentsSection
            postId={reel.id}
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            onCountChange={(n) => setCommentCount(n)}
          />
        </div>
      )}
    </div>
  );
};
