import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
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
}

export const PostCard = ({ post, onLikeChange }: PostCardProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(
    post.likes.some((like) => like.user_id === user?.id)
  );
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    
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
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <img
        src={post.image_url}
        alt="Post"
        className="w-full aspect-square object-cover"
      />

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              disabled={loading}
              className="group"
            >
              <Heart
                className={`h-6 w-6 transition-colors ${
                  liked ? "fill-red-500 text-red-500" : "group-hover:text-muted-foreground"
                }`}
              />
            </Button>
            <Link to={`/post/${post.id}`}>
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-6 w-6" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon">
              <Send className="h-6 w-6" />
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Bookmark className="h-6 w-6" />
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
    </Card>
  );
};
