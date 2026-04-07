import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Music, Play, Pause, TrendingUp, Loader2, ListMusic, Plus, Trash2 } from "lucide-react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AUDIUS_API = "https://discovery-provider.audius.co/v1";
const APP_NAME = "PRIMEGRAM";

interface AudiusTrack {
  id: string;
  title: string;
  user: { name: string };
  artwork?: { "150x150"?: string; "480x480"?: string; "1000x1000"?: string };
  duration: number;
}

const mapAudiusTrack = (t: AudiusTrack): Track => ({
  id: t.id,
  title: t.title,
  artist: t.user.name,
  albumArt: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
  platform: "audius" as any,
  previewUrl: `${AUDIUS_API}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
});

interface DBPlaylist {
  id: string;
  name: string;
  description: string | null;
}

interface DBPlaylistSong {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  album_art: string | null;
  preview_url: string;
  platform: string;
  position: number;
}

const MusicHub = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<DBPlaylist[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Record<string, DBPlaylistSong[]>>({});
  const { currentTrack, setCurrentTrack, isPlaying, togglePlayPause, setQueue } = useMusicPlayer();

  const fetchPlaylists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("playlists").select("id, name, description").eq("user_id", user.id).order("created_at", { ascending: false });
    setPlaylists((data as DBPlaylist[]) || []);
  }, [user]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const fetchPlaylistSongs = useCallback(async (playlistId: string) => {
    const { data } = await supabase.from("playlist_songs").select("*").eq("playlist_id", playlistId).order("position", { ascending: true });
    setPlaylistSongs(prev => ({ ...prev, [playlistId]: (data as DBPlaylistSong[]) || [] }));
  }, []);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AUDIUS_API}/tracks/trending?app_name=${APP_NAME}`);
      const json = await res.json();
      if (json.data) {
        const mapped = json.data.map(mapAudiusTrack);
        setTracks(mapped);
        setQueue(mapped);
      }
    } catch { toast.error("Failed to load trending tracks"); }
    finally { setLoading(false); }
  }, [setQueue]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${AUDIUS_API}/tracks/search?query=${encodeURIComponent(searchQuery)}&app_name=${APP_NAME}`);
      const json = await res.json();
      if (json.data) {
        const mapped = json.data.map(mapAudiusTrack);
        setTracks(mapped);
        setQueue(mapped);
      }
    } catch { toast.error("Search failed"); }
    finally { setLoading(false); }
  }, [searchQuery, setQueue]);

  useEffect(() => { fetchTrending(); }, [fetchTrending]);

  const handleTrackClick = (track: Track) => {
    if (currentTrack?.id === track.id) togglePlayPause();
    else setCurrentTrack(track);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    const { error } = await supabase.from("playlists").insert({ user_id: user.id, name: newPlaylistName.trim() });
    if (error) { toast.error("Failed to create playlist"); return; }
    setNewPlaylistName("");
    toast.success("Playlist created!");
    fetchPlaylists();
  };

  const addToPlaylist = async (playlistId: string, track: Track) => {
    const songs = playlistSongs[playlistId] || [];
    if (songs.some(s => s.track_id === track.id)) { toast.info("Already in playlist"); return; }
    const { error } = await supabase.from("playlist_songs").insert({
      playlist_id: playlistId, track_id: track.id, title: track.title,
      artist: track.artist, album_art: track.albumArt, preview_url: track.previewUrl,
      platform: track.platform, position: songs.length,
    });
    if (error) { toast.error("Failed to add"); return; }
    toast.success("Added to playlist");
    fetchPlaylistSongs(playlistId);
  };

  const playPlaylist = async (playlistId: string) => {
    if (!playlistSongs[playlistId]) await fetchPlaylistSongs(playlistId);
    const songs = playlistSongs[playlistId] || [];
    if (songs.length === 0) { toast.info("Playlist is empty"); return; }
    const mapped: Track[] = songs.map(s => ({
      id: s.track_id, title: s.title, artist: s.artist,
      albumArt: s.album_art || "", platform: s.platform as Track["platform"],
      previewUrl: s.preview_url,
    }));
    setQueue(mapped);
    setCurrentTrack(mapped[0]);
  };

  const deletePlaylist = async (id: string) => {
    await supabase.from("playlists").delete().eq("id", id);
    toast.success("Playlist deleted");
    fetchPlaylists();
  };

  const removeSongFromPlaylist = async (songId: string, playlistId: string) => {
    await supabase.from("playlist_songs").delete().eq("id", songId);
    fetchPlaylistSongs(playlistId);
    toast.success("Removed");
  };

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
            <Button variant="outline" size="sm" onClick={() => setShowPlaylists(false)}>Back to Music</Button>
          </div>
          <div className="flex gap-2 mb-6">
            <Input placeholder="New playlist name..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createPlaylist()} className="flex-1" />
            <Button onClick={createPlaylist} size="icon" disabled={!newPlaylistName.trim()}><Plus className="h-4 w-4" /></Button>
          </div>
          {playlists.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No playlists yet. Create one!</p>
          ) : (
            <div className="space-y-3">
              {playlists.map(pl => {
                const songs = playlistSongs[pl.id] || [];
                const isExpanded = selectedPlaylistId === pl.id;
                return (
                  <Card key={pl.id} className="hover:bg-accent/10 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{pl.name}</h3>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => playPlaylist(pl.id)}>
                            <Play className="h-4 w-4 mr-1" /> Play
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePlaylist(pl.id)}>Delete</Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{songs.length} tracks</p>
                      <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => {
                        if (!isExpanded) fetchPlaylistSongs(pl.id);
                        setSelectedPlaylistId(isExpanded ? null : pl.id);
                      }}>
                        {isExpanded ? "Hide tracks" : "Show tracks"}
                      </Button>
                      {isExpanded && (
                        <div className="mt-3 space-y-1">
                          {songs.map((s, si) => (
                            <div key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/5 cursor-pointer"
                              onClick={() => {
                                const mapped: Track[] = songs.map(ss => ({
                                  id: ss.track_id, title: ss.title, artist: ss.artist,
                                  albumArt: ss.album_art || "", platform: ss.platform as Track["platform"], previewUrl: ss.preview_url,
                                }));
                                setQueue(mapped);
                                setCurrentTrack(mapped[si]);
                              }}>
                              {s.album_art && <img src={s.album_art} alt={s.title} className="w-8 h-8 rounded" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{s.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{s.artist}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); removeSongFromPlaylist(s.id, pl.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
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
          <Button variant="outline" size="sm" onClick={() => setShowPlaylists(true)}>
            <ListMusic className="h-4 w-4 mr-1" /> Playlists
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Input placeholder="Search any song, artist..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()} className="flex-1" />
          <Button onClick={handleSearch} size="icon" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">{searchQuery ? "Search Results" : "Trending Now"}</h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">🎵 Powered by Audius — full song playback</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : tracks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No tracks found</p>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, i) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <Card key={track.id} className={`cursor-pointer transition-all hover:bg-accent/10 ${isActive ? "ring-1 ring-primary" : ""}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                    <img src={track.albumArt} alt={track.title} className="w-12 h-12 rounded object-cover" loading="lazy" onClick={() => handleTrackClick(track)} />
                    <div className="flex-1 min-w-0" onClick={() => handleTrackClick(track)}>
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {user && playlists.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xs" onClick={e => e.stopPropagation()}>
                            <DialogHeader><DialogTitle>Add to Playlist</DialogTitle></DialogHeader>
                            <div className="space-y-2 mt-2">
                              {playlists.map(pl => (
                                <button key={pl.id} onClick={() => addToPlaylist(pl.id, track)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-accent/10 border border-border">
                                  <p className="font-medium text-sm">{pl.name}</p>
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <button onClick={() => handleTrackClick(track)} className="p-1">
                        {isActive && isPlaying ? <Pause className="h-5 w-5 text-primary" /> : <Play className="h-5 w-5 text-primary" />}
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
