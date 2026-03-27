import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Music, Play, TrendingUp } from "lucide-react";

const TRENDING_VIDEOS = [
  { id: "dQw4w9WgXcQ", title: "Rick Astley - Never Gonna Give You Up", artist: "Rick Astley" },
  { id: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee" },
  { id: "RgKAFK5djSk", title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth" },
  { id: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran" },
  { id: "OPf0YbXqDm0", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars" },
  { id: "9bZkp7q19f0", title: "Gangnam Style", artist: "PSY" },
  { id: "hT_nvWreIhg", title: "Counting Stars", artist: "OneRepublic" },
  { id: "YQHsXMglC9A", title: "Hello", artist: "Adele" },
  { id: "fRh_vgS2dFE", title: "Sorry", artist: "Justin Bieber" },
  { id: "CevxZvSJLk8", title: "Roar", artist: "Katy Perry" },
  { id: "60ItHLz5WEA", title: "Alan Walker - Faded", artist: "Alan Walker" },
  { id: "pt8VYOfr8To", title: "Closer", artist: "The Chainsmokers ft. Halsey" },
];

const GENRES = ["All", "Pop", "Hip-Hop", "R&B", "Rock", "Afrobeats", "Latin", "Electronic"];

const MusicHub = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState("All");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const q = encodeURIComponent(searchQuery);
      setActiveVideo(`https://www.youtube.com/embed?listType=search&list=${q}`);
    }
  };

  const filteredVideos = TRENDING_VIDEOS.filter(
    (v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-16 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Music className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Prime Music</h1>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Search any song, artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
          {GENRES.map((genre) => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0"
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </Button>
          ))}
        </div>

        {/* Active player */}
        {activeVideo && (
          <Card className="mb-6 overflow-hidden">
            <div className="aspect-video">
              <iframe
                src={activeVideo.includes("embed") ? activeVideo : `https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Music Player"
              />
            </div>
          </Card>
        )}

        {/* Trending */}
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Trending Now</h2>
        </div>

        <div className="space-y-2">
          {filteredVideos.map((video, i) => (
            <Card
              key={video.id}
              className={`cursor-pointer transition-all hover:bg-accent/10 ${activeVideo === video.id ? "ring-1 ring-primary" : ""}`}
              onClick={() => setActiveVideo(video.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                <img
                  src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                  alt={video.title}
                  className="w-16 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{video.artist}</p>
                </div>
                <Play className="h-5 w-5 text-primary flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default MusicHub;
