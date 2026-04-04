import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX, BookmarkCheck, Share2, Flag, Trash2, Copy } from "lucide-react";
import { CommentsSection } from "@/components/CommentsSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: {
    id: string;
    image_url: string;
    video_url?: string;
    media_type?: string;
    caption: string;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      avatar_url: string;
    };
    likes: any[];
  };
  onLikeChange?: () => void;
  isGuest?: boolean;
}

export const PostCard = ({ post, onLikeChange, isGuest }: PostCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(
    post.likes.some((like) => like.user_id === user?.id)
  );
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLike = async () => {
    if (!user || isGuest) {
      if (isGuest) toast.info("Sign in to like posts");
      return;
    }
    
    setLoading(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
      onLikeChange?.();
    } catch (error: any) {
      toast.error("Failed to update like");
    } finally {
      setLoading(false);
    }
  };

  const isVideo = post.media_type === "video" && post.video_url;
  const isOwnPost = user?.id === post.profiles.id;

  const handleDelete = async () => {
    if (!user || !isOwnPost) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Post deleted");
      onLikeChange?.();
    } catch {
      toast.error("Failed to delete post");
    }
    setShowMenu(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${post.profiles.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Post by ${post.profiles.username}`, text: post.caption, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
    setShowMenu(false);
  };

  const handleSave = () => {
    setSaved(!saved);
    toast.success(saved ? "Removed from saved" : "Post saved!");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/profile/${post.profiles.id}`);
    toast.success("Link copied!");
    setShowMenu(false);
  };

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow duration-300">
      <div className="p-4 flex items-center justify-between">
        <Link to={`/profile/${post.profiles.id}`} className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.profiles.avatar_url} />
            <AvatarFallback>
              {post.profiles.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold">{post.profiles.username}</span>
        </Link>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 glass rounded-lg border border-border shadow-lg z-50 overflow-hidden min-w-[160px]">
              <button onClick={handleShare} className="w-full px-4 py-2.5 text-sm hover:bg-accent/10 flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button onClick={handleCopyLink} className="w-full px-4 py-2.5 text-sm hover:bg-accent/10 flex items-center gap-2">
                <Copy className="h-4 w-4" /> Copy Link
              </button>
              {!isOwnPost && (
                <button onClick={() => { toast.info("Post reported"); setShowMenu(false); }} className="w-full px-4 py-2.5 text-sm hover:bg-accent/10 flex items-center gap-2 text-destructive">
                  <Flag className="h-4 w-4" /> Report
                </button>
              )}
              {isOwnPost && (
                <button onClick={handleDelete} className="w-full px-4 py-2.5 text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isVideo ? (
        <div className="relative">
          <video
            src={post.video_url}
            className="w-full aspect-[4/5] object-cover"
            autoPlay
            loop
            muted={muted}
            playsInline
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-3 right-3 bg-black/50 text-white hover:bg-black/70 rounded-full h-8 w-8"
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <img
          src={post.image_url}
          alt="Post"
          className="w-full aspect-[4/5] object-cover"
        />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLike} disabled={loading} className="group">
              <Heart className={`h-6 w-6 transition-colors ${liked ? "fill-red-500 text-red-500" : "group-hover:text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => isGuest ? toast.info("Sign in to comment") : setShowComments(!showComments)}>
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSave}>
            {saved ? <BookmarkCheck className="h-6 w-6 text-primary" /> : <Bookmark className="h-6 w-6" />}
          </Button>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-sm">{likeCount} likes</p>
          <p className="text-sm">
            <Link to={`/profile/${post.profiles.id}`} className="font-semibold mr-2">
              {post.profiles.username}
            </Link>
            {post.caption}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <CommentsSection postId={post.id} isOpen={showComments} onClose={() => setShowComments(false)} />
    </Card>
  );
};
