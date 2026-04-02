import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PrimeAI } from "@/components/PrimeAI";
import { PostCard } from "@/components/PostCard";
import { StoriesBar } from "@/components/StoriesBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const MemoizedPostCard = memo(PostCard);

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isGuest = sessionStorage.getItem("guest_mode") === "true";

  useEffect(() => {
    if (!authLoading && !user && !isGuest) navigate("/auth");
  }, [user, authLoading, navigate, isGuest]);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`id, image_url, video_url, media_type, caption, created_at, user_id, profiles:user_id (id, username, avatar_url), likes (user_id)`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isGuest) return null;

  return (
    <div className="min-h-screen pb-16 relative z-10">
      <Header />
      <StoriesBar />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Start following people or create your first post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <MemoizedPostCard key={post.id} post={post} onLikeChange={fetchPosts} isGuest={isGuest} />
            ))
          )}
        </div>
      </main>
      {!isGuest && <PrimeAI />}
      <BottomNav />
    </div>
  );
};

export default Home;
