import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ReelCard } from "@/components/ReelCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Reels = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchReels();
  }, [user]);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from("reels")
        .select(`id, video_url, caption, views, thumbnail_url, created_at, profiles:user_id (id, username, avatar_url)`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setReels(data || []);
    } catch {
      console.error("Error fetching reels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const itemHeight = window.innerHeight;
      const index = Math.round(scrollTop / itemHeight);
      if (index !== currentIndex && index >= 0 && index < reels.length) {
        setCurrentIndex(index);
      }
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [currentIndex, reels.length]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-4 pb-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-white font-bold text-lg">Reels</h1>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 bg-primary/80 rounded-full" onClick={() => navigate("/reels/dashboard")}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Reels container */}
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {reels.length === 0 ? (
          <div className="h-screen flex flex-col items-center justify-center text-white gap-4">
            <p className="text-xl font-semibold">No reels yet</p>
            <p className="text-muted-foreground text-sm">Be the first to create one!</p>
            <Button onClick={() => navigate("/reels/dashboard")}
              className="bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)]">
              Create your first reel
            </Button>
          </div>
        ) : (
          reels.map((reel, index) => (
            <ReelCard key={reel.id} reel={reel} isActive={index === currentIndex} />
          ))
        )}
      </div>

      {/* Progress indicators */}
      {reels.length > 1 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
          {reels.slice(0, 10).map((_, index) => (
            <div key={index} className={`rounded-full transition-all ${
              index === currentIndex ? "bg-white h-3 w-1.5" : "bg-white/40 h-1.5 w-1.5"
            }`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Reels;
