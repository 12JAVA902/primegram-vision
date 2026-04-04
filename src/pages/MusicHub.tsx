import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Music, Play, Pause, TrendingUp, Link2, CheckCircle2, Loader2, ListMusic, Plus } from "lucide-react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
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

interface Playlist {
  name: string;
  tracks: Track[];
}

const MusicHub = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("0");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("prime_playlists") || "[]");
    } catch { return []; }
  });
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const { currentTrack, setCurrentTrack, isPlaying, togglePlayPause, setQueue } = useMusicPlayer();

  const savePlaylists = (pls: Playlist[]) => {
    setPlaylists(pls);
    localStorage.setItem("prime_playlists", JSON.stringify(pls));
  };

  const fetchChart = useCallback(async (genreId: string) => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?action=chart&genre_id=${genreId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const json = await res.json();
      if (json.data) {
        const mapped = json.data.map(mapDeezerTrack);
        setTracks(mapped);
        setQueue(mapped);
      }
    } catch {
      toast.error("Failed to load trending tracks");
    } finally {
      setLoading(false);
    }
  }, [setQueue]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?action=search&q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const json = await res.json();
      if (json.data) {
        const mapped = json.data.map(mapDeezerTrack);
        setTracks(mapped);
        setQueue(mapped);
      }
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, setQueue]);

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

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const updated = [...playlists, { name: newPlaylistName.trim(), tracks: [] }];
    savePlaylists(updated);
    setNewPlaylistName("");
    toast.success("Playlist created!");
  };

  const addToPlaylist = (playlistIdx: number, track: Track) => {
    const updated = [...playlists];
    if (updated[playlistIdx].tracks.some(t => t.id === track.id)) {
      toast.info("Already in playlist");
      return;
    }
    updated[playlistIdx].tracks.push(track);
    savePlaylists(updated);
    toast.success(`Added to ${updated[playlistIdx].name}`);
  };

  const playPlaylist = (playlistIdx: number) => {
    const pl = playlists[playlistIdx];
    if (pl.tracks.length === 0) {
      toast.info("Playlist is empty");
      return;
    }
    setQueue(pl.tracks);
    setCurrentTrack(pl.tracks[0]);
    toast.success(`Playing ${pl.name}`);
  };

  const deletePlaylist = (idx: number) => {
    const updated = playlists.filter((_, i) => i !== idx);
    savePlaylists(updated);
    toast.success("Playlist deleted");
  };

  // Playlist view
  if (showPlaylists) {
    return (
      <div className="min-h-screen pb-32 relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ListMusic className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold">My Playlists</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPlaylists(false)}>
              Back to Music
            </Button>
          </div>

          <div className="flex gap-2 mb-6">
            <Input
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
              className="flex-1"
            />
            <Button onClick={createPlaylist} size="icon" disabled={!newPlaylistName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {playlists.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No playlists yet. Create one!</p>
          ) : (
            <div className="space-y-3">
              {playlists.map((pl, idx) => (
                <Card key={idx} className="cursor-pointer hover:bg-accent/10 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{pl.name}</h3>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => playPlaylist(idx)}>
                          <Play className="h-4 w-4 mr-1" /> Play All
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePlaylist(idx)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{pl.tracks.length} tracks</p>
                    {selectedPlaylist === idx && (
                      <div className="mt-3 space-y-1">
                        {pl.tracks.map((t, ti) => (
                          <div key={ti} className="flex items-center gap-2 p-2 rounded hover:bg-accent/5"
                            onClick={() => { setQueue(pl.tracks); setCurrentTrack(t); }}>
                            <img src={t.albumArt} alt={t.title} className="w-8 h-8 rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{t.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{t.artist}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button size="sm" variant="ghost" className="mt-1 text-xs"
                      onClick={() => setSelectedPlaylist(selectedPlaylist === idx ? null : idx)}>
                      {selectedPlaylist === idx ? "Hide tracks" : "Show tracks"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Music className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Prime Music</h1>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPlaylists(true)}>
              <ListMusic className="h-4 w-4 mr-1" /> Playlists
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Connect
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
                          connected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent/5"
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-lg ${p.color} flex items-center justify-center text-lg`}>{p.icon}</span>
                        <span className="flex-1 text-left font-medium">{p.name}</span>
                        {connected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
              onClick={() => { setSelectedGenre(genre.id); setSearchQuery(""); }}
            >
              {genre.label}
            </Button>
          ))}
        </div>

        {/* Trending */}
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">{searchQuery ? "Search Results" : "Trending Now"}</h2>
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
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                    <img src={track.albumArt} alt={track.title} className="w-12 h-12 rounded object-cover" loading="lazy"
                      onClick={() => handleTrackClick(track)} />
                    <div className="flex-1 min-w-0" onClick={() => handleTrackClick(track)}>
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {playlists.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
                            <DialogHeader><DialogTitle>Add to Playlist</DialogTitle></DialogHeader>
                            <div className="space-y-2 mt-2">
                              {playlists.map((pl, idx) => (
                                <button key={idx} onClick={() => addToPlaylist(idx, track)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-accent/10 border border-border">
                                  <p className="font-medium text-sm">{pl.name}</p>
                                  <p className="text-xs text-muted-foreground">{pl.tracks.length} tracks</p>
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <button onClick={() => handleTrackClick(track)} className="p-1">
                        {isActive && isPlaying ? (
                          <Pause className="h-5 w-5 text-primary" />
                        ) : (
                          <Play className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    </div>
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
