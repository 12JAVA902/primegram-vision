import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ReelCard } from "@/components/ReelCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Reels = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchReels();
    }
  }, [user]);

  const fetchReels = async () => {
    try {
      const { data, error } = await supabase
        .from("reels")
        .select(`
          *,
          profiles:user_id (id, username, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error("Error fetching reels:", error);
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
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 text-white hover:bg-white/20"
        onClick={() => navigate("/home")}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Add Reel button */}
      <Button
        variant="default"
        size="icon"
        className="absolute top-4 right-4 z-50 bg-primary hover:bg-primary/90 text-white rounded-full h-12 w-12"
        onClick={() => navigate("/reels/dashboard")}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Reels container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {reels.length === 0 ? (
          <div className="h-screen flex flex-col items-center justify-center text-white">
            <p className="text-xl mb-4">No reels yet</p>
            <Button
              onClick={() => navigate("/reels/dashboard")}
              className="bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)]"
            >
              Create your first reel
            </Button>
          </div>
        ) : (
          reels.map((reel, index) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              isActive={index === currentIndex}
            />
          ))
        )}
      </div>

      {/* Indicator dots */}
      {reels.length > 0 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
          {reels.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white h-2 w-2"
                  : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Reels;
