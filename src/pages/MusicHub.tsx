import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Music, Play, Pause, TrendingUp, Loader2, ListMusic, Plus, Trash2, Flame, Clock } from "lucide-react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MusicTrackDB {
  id: string;
  title: string;
  artist: string;
  album_art_url: string | null;
  genre: string | null;
  duration_seconds: number | null;
  is_trending: boolean | null;
  created_at: string;
}

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

const GENRES = ["All", "Pop", "Hip-Hop", "R&B", "Rock", "Electronic", "Jazz", "Classical", "Country", "Indie"];

const mapDBTrack = (track: MusicTrackDB): Track => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  albumArt: track.album_art_url || "",
  platform: "local",
  previewUrl: track.id,
  genre: track.genre || undefined,
  durationSeconds: track.duration_seconds || undefined,
  isTrending: track.is_trending || false,
  playCount: Math.floor(Math.random() * 50000) + 1000, // Simulated play count
});

const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatPlayCount = (count: number | undefined) => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const MusicHub = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
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

  // Fetch tracks from music_tracks table
  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .order("is_trending", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const mapped = (data as MusicTrackDB[]).map(mapDBTrack);
        setTracks(mapped);
        setFilteredTracks(mapped);
        setQueue(mapped);
      } else {
        // Show empty state
        setTracks([]);
        setFilteredTracks([]);
      }
    } catch (err) {
      console.error("[v0] Failed to fetch tracks:", err);
      toast.error("Failed to load music tracks");
    } finally {
      setLoading(false);
    }
  }, [setQueue]);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  // Filter tracks by search and genre
  useEffect(() => {
    let result = tracks;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        track => 
          track.title.toLowerCase().includes(query) || 
          track.artist.toLowerCase().includes(query)
      );
    }
    
    if (selectedGenre !== "All") {
      result = result.filter(track => track.genre === selectedGenre);
    }
    
    setFilteredTracks(result);
  }, [tracks, searchQuery, selectedGenre]);

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

  // Playlist view
  if (showPlaylists) {
    return (
      <div className="min-h-screen pb-32 relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <ListMusic className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold">My Playlists</h1>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPlaylists(false)} className="glass-light border-white/10">
                Back to Music
              </Button>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="New playlist name..." 
                value={newPlaylistName} 
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createPlaylist()} 
                className="flex-1 glass-light border-white/10 focus:border-primary/50" 
              />
              <Button onClick={createPlaylist} size="icon" disabled={!newPlaylistName.trim()} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {playlists.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <ListMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No playlists yet. Create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playlists.map(pl => {
                const songs = playlistSongs[pl.id] || [];
                const isExpanded = selectedPlaylistId === pl.id;
                return (
                  <Card key={pl.id} className="glass border-white/10 hover:border-primary/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{pl.name}</h3>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => playPlaylist(pl.id)} className="hover:bg-primary/20">
                            <Play className="h-4 w-4 mr-1" /> Play
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/20" onClick={() => deletePlaylist(pl.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{songs.length} tracks</p>
                      <Button size="sm" variant="ghost" className="mt-1 text-xs hover:bg-white/5" onClick={() => {
                        if (!isExpanded) fetchPlaylistSongs(pl.id);
                        setSelectedPlaylistId(isExpanded ? null : pl.id);
                      }}>
                        {isExpanded ? "Hide tracks" : "Show tracks"}
                      </Button>
                      {isExpanded && (
                        <div className="mt-3 space-y-1">
                          {songs.map((s, si) => (
                            <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
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
                              <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-destructive/20" onClick={e => { e.stopPropagation(); removeSongFromPlaylist(s.id, pl.id); }}>
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
        {/* Header Section with Glassmorphism */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Prime Music
                </h1>
                <p className="text-xs text-muted-foreground">Your personal music hub</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPlaylists(true)}
              className="glass-light border-white/10 hover:border-primary/30"
            >
              <ListMusic className="h-4 w-4 mr-1" /> Playlists
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search songs, artists..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 glass-light border-white/10 focus:border-primary/50 transition-colors" 
              />
            </div>
          </div>

          {/* Genre Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedGenre === genre
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                    : "glass-light text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-lg font-semibold">
            {searchQuery ? "Search Results" : selectedGenre !== "All" ? selectedGenre : "Trending Now"}
          </h2>
          <span className="text-sm text-muted-foreground">
            ({filteredTracks.length} tracks)
          </span>
        </div>

        {/* Track List */}
        {loading ? (
          <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading tracks...</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {tracks.length === 0 
                ? "No music tracks in the database yet" 
                : "No tracks found matching your search"}
            </p>
            {tracks.length === 0 && (
              <p className="text-xs text-muted-foreground">Add tracks to the music_tracks table to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTracks.map((track, i) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <Card 
                  key={track.id} 
                  className={`glass border-white/10 cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg ${
                    isActive ? "ring-2 ring-primary/50 border-primary/50" : ""
                  }`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* Track Number */}
                    <span className="text-sm font-bold text-muted-foreground w-6 text-right">
                      {i + 1}
                    </span>
                    
                    {/* Album Art with Play Overlay */}
                    <div 
                      className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 group cursor-pointer"
                      onClick={() => handleTrackClick(track)}
                    >
                      {track.albumArt ? (
                        <img 
                          src={track.albumArt} 
                          alt={track.title} 
                          className="w-full h-full object-cover" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                          <Music className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isActive && isPlaying ? (
                          <Pause className="h-6 w-6 text-white" />
                        ) : (
                          <Play className="h-6 w-6 text-white" />
                        )}
                      </div>
                      {/* Trending Badge */}
                      {track.isTrending && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                          <Flame className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Track Info */}
                    <div className="flex-1 min-w-0" onClick={() => handleTrackClick(track)}>
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {track.genre && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            {track.genre}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(track.durationSeconds)}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {formatPlayCount(track.playCount)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {user && playlists.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/20" 
                              onClick={e => e.stopPropagation()}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xs glass border-white/10" onClick={e => e.stopPropagation()}>
                            <DialogHeader>
                              <DialogTitle>Add to Playlist</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 mt-2">
                              {playlists.map(pl => (
                                <button 
                                  key={pl.id} 
                                  onClick={() => addToPlaylist(pl.id, track)}
                                  className="w-full text-left p-3 rounded-lg glass-light hover:border-primary/30 border border-white/10 transition-colors"
                                >
                                  <p className="font-medium text-sm">{pl.name}</p>
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <button 
                        onClick={() => handleTrackClick(track)} 
                        className="p-2 rounded-full hover:bg-primary/20 transition-colors"
                      >
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
