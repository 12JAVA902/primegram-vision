import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Music, Play, TrendingUp, Link2, CheckCircle2 } from "lucide-react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "spotify" as const, name: "Spotify", color: "bg-green-500", icon: "🎵" },
  { id: "apple" as const, name: "Apple Music", color: "bg-pink-500", icon: "🎶" },
  { id: "youtube" as const, name: "YouTube Music", color: "bg-red-500", icon: "▶️" },
];

const TRENDING_TRACKS: Track[] = [
  { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", artist: "Rick Astley", albumArt: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" },
  { id: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", albumArt: "https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/kJQP7kiw5Fk?autoplay=1" },
  { id: "RgKAFK5djSk", title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth", albumArt: "https://img.youtube.com/vi/RgKAFK5djSk/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/RgKAFK5djSk?autoplay=1" },
  { id: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran", albumArt: "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/JGwWNGJdvx8?autoplay=1" },
  { id: "OPf0YbXqDm0", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", albumArt: "https://img.youtube.com/vi/OPf0YbXqDm0/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/OPf0YbXqDm0?autoplay=1" },
  { id: "9bZkp7q19f0", title: "Gangnam Style", artist: "PSY", albumArt: "https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/9bZkp7q19f0?autoplay=1" },
  { id: "hT_nvWreIhg", title: "Counting Stars", artist: "OneRepublic", albumArt: "https://img.youtube.com/vi/hT_nvWreIhg/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/hT_nvWreIhg?autoplay=1" },
  { id: "YQHsXMglC9A", title: "Hello", artist: "Adele", albumArt: "https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/YQHsXMglC9A?autoplay=1" },
  { id: "fRh_vgS2dFE", title: "Sorry", artist: "Justin Bieber", albumArt: "https://img.youtube.com/vi/fRh_vgS2dFE/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/fRh_vgS2dFE?autoplay=1" },
  { id: "CevxZvSJLk8", title: "Roar", artist: "Katy Perry", albumArt: "https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/CevxZvSJLk8?autoplay=1" },
  { id: "60ItHLz5WEA", title: "Faded", artist: "Alan Walker", albumArt: "https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/60ItHLz5WEA?autoplay=1" },
  { id: "pt8VYOfr8To", title: "Closer", artist: "The Chainsmokers ft. Halsey", albumArt: "https://img.youtube.com/vi/pt8VYOfr8To/mqdefault.jpg", platform: "youtube", embedUrl: "https://www.youtube.com/embed/pt8VYOfr8To?autoplay=1" },
];

const GENRES = ["All", "Pop", "Hip-Hop", "R&B", "Rock", "Afrobeats", "Latin", "Electronic"];

const MusicHub = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const { currentTrack, setCurrentTrack } = useMusicPlayer();

  const handleConnect = (platformId: string) => {
    if (connectedPlatforms.includes(platformId)) {
      setConnectedPlatforms((prev) => prev.filter((p) => p !== platformId));
      toast.success("Disconnected");
    } else {
      setConnectedPlatforms((prev) => [...prev, platformId]);
      toast.success("Connected! Songs from this platform will appear in search.");
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const q = encodeURIComponent(searchQuery);
      setCurrentTrack({
        id: "search",
        title: searchQuery,
        artist: "Search Results",
        albumArt: "",
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed?listType=search&list=${q}`,
      });
    }
  };

  const filteredTracks = TRENDING_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-32 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Music className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Prime Music</h1>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Link2 className="h-4 w-4" />
                Connect Music
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Connect Your Music</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {PLATFORMS.map((p) => {
                  const connected = connectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleConnect(p.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        connected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-accent/5"
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-lg ${p.color} flex items-center justify-center text-lg`}>
                        {p.icon}
                      </span>
                      <span className="flex-1 text-left font-medium">{p.name}</span>
                      {connected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Connect platforms to search songs across all your libraries
              </p>
            </DialogContent>
          </Dialog>
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

        {/* Connected platforms badges */}
        {connectedPlatforms.length > 0 && (
          <div className="flex gap-2 mb-4">
            {connectedPlatforms.map((pId) => {
              const p = PLATFORMS.find((pl) => pl.id === pId);
              return p ? (
                <span key={pId} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {p.icon} {p.name}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Trending */}
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Trending Now</h2>
        </div>

        <div className="space-y-2">
          {filteredTracks.map((track, i) => (
            <Card
              key={track.id}
              className={`cursor-pointer transition-all hover:bg-accent/10 ${currentTrack?.id === track.id ? "ring-1 ring-primary" : ""}`}
              onClick={() => setCurrentTrack(track)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                <img
                  src={track.albumArt}
                  alt={track.title}
                  className="w-12 h-12 rounded object-cover"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
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
