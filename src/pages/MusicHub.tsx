import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Music, Play, Pause, TrendingUp, Link2, CheckCircle2, Loader2 } from "lucide-react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "spotify" as const, name: "Spotify", color: "bg-green-500", icon: "🎵" },
  { id: "apple" as const, name: "Apple Music", color: "bg-pink-500", icon: "🎶" },
  { id: "deezer" as const, name: "Deezer", color: "bg-purple-500", icon: "🎧" },
];

const GENRES = [
  { label: "All", id: "0" },
  { label: "Pop", id: "132" },
  { label: "Hip-Hop", id: "116" },
  { label: "R&B", id: "165" },
  { label: "Rock", id: "152" },
  { label: "Afrobeats", id: "2" },
  { label: "Latin", id: "197" },
  { label: "Electronic", id: "106" },
];

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { cover_medium: string };
  preview: string;
}

const mapDeezerTrack = (t: DeezerTrack): Track => ({
  id: String(t.id),
  title: t.title,
  artist: t.artist.name,
  albumArt: t.album.cover_medium,
  platform: "deezer",
  previewUrl: t.preview,
});

const MusicHub = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("0");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentTrack, setCurrentTrack, isPlaying, togglePlayPause } = useMusicPlayer();

  const fetchChart = useCallback(async (genreId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("music-search", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });
      // Use query params via direct fetch since invoke doesn't support them well
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?action=chart&genre_id=${genreId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const json = await res.json();
      if (json.data) {
        setTracks(json.data.map(mapDeezerTrack));
      }
    } catch (e) {
      console.error("Chart fetch error:", e);
      toast.error("Failed to load trending tracks");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?action=search&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const json = await res.json();
      if (json.data) {
        setTracks(json.data.map(mapDeezerTrack));
      }
    } catch (e) {
      console.error("Search error:", e);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchChart(selectedGenre);
  }, [selectedGenre, fetchChart]);

  const handleConnect = (platformId: string) => {
    if (connectedPlatforms.includes(platformId)) {
      setConnectedPlatforms((prev) => prev.filter((p) => p !== platformId));
      toast.success("Disconnected");
    } else {
      setConnectedPlatforms((prev) => [...prev, platformId]);
      toast.success("Connected!");
    }
  };

  const handleTrackClick = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
    }
  };

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
                Connect platforms to enhance your music experience
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
          <Button onClick={handleSearch} size="icon" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
          {GENRES.map((genre) => (
            <Button
              key={genre.id}
              variant={selectedGenre === genre.id ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                setSelectedGenre(genre.id);
                setSearchQuery("");
              }}
            >
              {genre.label}
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
          <h2 className="text-lg font-semibold">
            {searchQuery ? "Search Results" : "Trending Now"}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tracks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No tracks found</p>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, i) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <Card
                  key={track.id}
                  className={`cursor-pointer transition-all hover:bg-accent/10 ${isActive ? "ring-1 ring-primary" : ""}`}
                  onClick={() => handleTrackClick(track)}
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
                    {isActive && isPlaying ? (
                      <Pause className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <Play className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </CardContent>
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

export default MusicHub;
