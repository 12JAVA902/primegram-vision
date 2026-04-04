import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PrimeAI } from "@/components/PrimeAI";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Explore = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"posts" | "people">("posts");

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() && searchMode === "people") {
      searchPeople();
    }
  }, [searchQuery, searchMode]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, image_url, video_url, media_type, caption")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setPosts(data || []);
    } catch {
      console.error("Error fetching posts");
    } finally {
      setLoading(false);
    }
  };

  const searchPeople = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);
      setPeople(data || []);
    } catch {
      console.error("Error searching people");
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.caption?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-16 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchMode === "people" ? "Search people..." : "Search posts..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Toggle */}
        <div className="max-w-2xl mx-auto flex gap-2 mb-6">
          <Button variant={searchMode === "posts" ? "default" : "outline"} size="sm" onClick={() => setSearchMode("posts")}>
            Posts
          </Button>
          <Button variant={searchMode === "people" ? "default" : "outline"} size="sm" onClick={() => setSearchMode("people")}>
            <Users className="h-4 w-4 mr-1" /> People
          </Button>
        </div>

        {searchMode === "people" ? (
          <div className="max-w-2xl mx-auto space-y-2">
            {people.length === 0 && searchQuery.trim() ? (
              <p className="text-center text-muted-foreground py-12">No people found</p>
            ) : !searchQuery.trim() ? (
              <p className="text-center text-muted-foreground py-12">Type a name to search</p>
            ) : (
              people.map((person) => (
                <Link key={person.id} to={`/profile/${person.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors">
                  <Avatar>
                    <AvatarImage src={person.avatar_url || undefined} />
                    <AvatarFallback>{person.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{person.username}</p>
                    {person.full_name && <p className="text-xs text-muted-foreground">{person.full_name}</p>}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {filteredPosts.map((post) => (
                  <Card key={post.id} className="aspect-square overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                    {post.media_type === "video" && post.video_url ? (
                      <video src={post.video_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                    )}
                  </Card>
                ))}
              </div>
            )}
            {!loading && filteredPosts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No posts found</div>
            )}
          </>
        )}
      </main>
      <PrimeAI />
      <BottomNav />
    </div>
  );
};

export default Explore;
