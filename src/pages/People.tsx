import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, UserPlus, Check, Search } from "lucide-react";
import { toast } from "sonner";

const People = () => {
  const { user } = useAuth();
  const [people, setPeople] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, full_name, bio")
          .neq("id", user?.id || "")
          .limit(50);
        setPeople(profiles || []);

        if (user) {
          const { data: follows } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id);
          setFollowing(new Set((follows || []).map((f: any) => f.following_id)));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const toggleFollow = async (id: string) => {
    if (!user) return toast.error("Sign in to follow");
    const isFollowing = following.has(id);
    const next = new Set(following);
    if (isFollowing) {
      next.delete(id);
      setFollowing(next);
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
    } else {
      next.add(id);
      setFollowing(next);
      await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
    }
  };

  return (
    <div className="min-h-screen pb-24 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">People to follow</h1>
        <p className="text-sm text-muted-foreground mb-6">Discover new creators on Primegram</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : people.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No one to suggest yet</p>
        ) : (
          <div className="space-y-3">
            {people.map((p) => {
              const isFollowing = following.has(p.id);
              return (
                <Card key={p.id} className="p-3 flex items-center gap-3">
                  <Link to={`/profile/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback>{p.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.username}</p>
                      {p.full_name && <p className="text-xs text-muted-foreground truncate">{p.full_name}</p>}
                      {p.bio && <p className="text-xs text-muted-foreground truncate">{p.bio}</p>}
                    </div>
                  </Link>
                  <Button
                    size="sm"
                    variant={isFollowing ? "outline" : "default"}
                    onClick={() => toggleFollow(p.id)}
                    className={!isFollowing ? "bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)]" : ""}
                  >
                    {isFollowing ? <><Check className="h-4 w-4 mr-1" /> Following</> : <><UserPlus className="h-4 w-4 mr-1" /> Follow</>}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default People;
