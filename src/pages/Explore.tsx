import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PrimeAI } from "@/components/PrimeAI";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Users, Image as ImageIcon, Video, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const TAGS = ["Trending", "Music", "Sports", "Travel", "Food", "Art", "Tech", "Fashion"];

const Explore = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"posts" | "people">("posts");
  const [activeTag, setActiveTag] = useState("Trending");

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
        .select("id, image_url, video_url, media_type, caption, user_id, profiles:user_id(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(48);
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

  // Mosaic sizing — make every 7th tile larger
  const tileClass = (i: number) =>
    i % 7 === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square";

  return (
    <div className="min-h-screen pb-28 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Discover
          </h1>
          <p className="text-sm text-muted-foreground">Fresh posts, people, and ideas</p>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchMode === "people" ? "Search people..." : "Search posts, captions, tags..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-full liquid-glass border-none"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSearchMode("posts")}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
              searchMode === "posts"
                ? "bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] text-white shadow-lg"
                : "liquid-glass text-muted-foreground"
            }`}
          >
            <ImageIcon className="inline h-4 w-4 mr-1" /> Posts
          </button>
          <button
            onClick={() => setSearchMode("people")}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
              searchMode === "people"
                ? "bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] text-white shadow-lg"
                : "liquid-glass text-muted-foreground"
            }`}
          >
            <Users className="inline h-4 w-4 mr-1" /> People
          </button>
        </div>

        {searchMode === "posts" && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-1 px-1">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTag === tag
                    ? "bg-foreground text-background"
                    : "liquid-glass text-muted-foreground"
                }`}
              >
                {tag === "Trending" && <TrendingUp className="inline h-3 w-3 mr-1" />}
                {tag}
              </button>
            ))}
          </div>
        )}

        {searchMode === "people" ? (
          <div className="space-y-2">
            {people.length === 0 && searchQuery.trim() ? (
              <p className="text-center text-muted-foreground py-12">No people found</p>
            ) : !searchQuery.trim() ? (
              <p className="text-center text-muted-foreground py-12">Type a name to search</p>
            ) : (
              people.map((person) => (
                <Link
                  key={person.id}
                  to={`/profile/${person.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl liquid-glass hover:scale-[1.01] transition-transform"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={person.avatar_url || undefined} />
                    <AvatarFallback>{person.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{person.username}</p>
                    {person.full_name && (
                      <p className="text-xs text-muted-foreground">{person.full_name}</p>
                    )}
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
              <div className="grid grid-cols-3 auto-rows-[110px] sm:auto-rows-[140px] gap-1.5">
                {filteredPosts.map((post, i) => (
                  <Card
                    key={post.id}
                    className={`${tileClass(i)} overflow-hidden cursor-pointer group relative border-none`}
                  >
                    {post.media_type === "video" && post.video_url ? (
                      <>
                        <video src={post.video_url} className="w-full h-full object-cover" muted />
                        <Video className="absolute top-1.5 right-1.5 h-4 w-4 text-white drop-shadow" />
                      </>
                    ) : (
                      <img
                        src={post.image_url}
                        alt={post.caption || "Post"}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate">
                        @{post.profiles?.username || "user"}
                      </p>
                    </div>
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
