import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CommentsSectionProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsSection = ({ postId, isOpen, onClose }: CommentsSectionProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id, text, user_id, created_at, profiles:user_id(id, username, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments((data as any) || []);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        text: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      fetchComments();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border-t border-border px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Comments</p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Hide</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No comments yet</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Link to={`/profile/${comment.profiles.id}`}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={comment.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{comment.profiles.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/profile/${comment.profiles.id}`} className="font-semibold mr-1.5 hover:underline">
                    {comment.profiles.username}
                  </Link>
                  {comment.text}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
              {user?.id === comment.user_id && (
                <button onClick={() => handleDelete(comment.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Add a comment..."
            className="flex-1 h-9 text-sm"
          />
          <Button onClick={handleSubmit} disabled={submitting || !newComment.trim()} size="icon" className="h-9 w-9">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
