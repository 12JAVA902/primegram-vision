import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Music, Play, Pause, TrendingUp, Loader2, ListMusic, Plus, Trash2, Flame, Globe, Sparkles } from "lucide-react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string };
      high: { url: string };
    };
  };
}

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

const YOUTUBE_API_KEY = "AIzaSyDfR4XWnLgjtlFl-9ePCkl0cvdlMqlx6V0";

const mapDBTrack = (track: MusicTrackDB): Track => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  albumArt: track.album_art_url || "",
  platform: "youtube",
  previewUrl: track.id,
  genre: track.genre || undefined,
  durationSeconds: track.duration_seconds || undefined,
  isTrending: track.is_trending || false,
  playCount: Math.floor(Math.random() * 50000) + 1000,
});

const mapYouTubeResult = (item: YouTubeSearchResult): Track => ({
  id: item.id.videoId,
  title: item.snippet.title.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  artist: item.snippet.channelTitle.replace(/ - Topic$/, "").replace(/VEVO$/, ""),
  albumArt: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || "",
  platform: "youtube",
  previewUrl: item.id.videoId,
  isTrending: false,
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

// Animated Liquid Glass Background Component
const LiquidGlassBackground = () => (
  <div className="liquid-glass-bg">
    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <radialGradient id="liquidGrad1" cx="30%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#FF00FF" stopOpacity="0.4">
            <animate attributeName="stopOpacity" values="0.4;0.6;0.4" dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="liquidGrad2" cx="70%" cy="70%" r="50%">
          <stop offset="0%" stopColor="#2D004F" stopOpacity="0.5">
            <animate attributeName="stopOpacity" values="0.5;0.7;0.5" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="liquidGrad3" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#000B2E" stopOpacity="0.3">
            <animate attributeName="stopOpacity" values="0.3;0.5;0.3" dur="5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="30" cy="30" r="40" fill="url(#liquidGrad1)">
        <animate attributeName="cx" values="30;40;30" dur="8s" repeatCount="indefinite" />
        <animate attributeName="cy" values="30;40;30" dur="10s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="70" r="45" fill="url(#liquidGrad2)">
        <animate attributeName="cx" values="70;60;70" dur="12s" repeatCount="indefinite" />
        <animate attributeName="cy" values="70;60;70" dur="9s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="50" cy="50" rx="50" ry="30" fill="url(#liquidGrad3)">
        <animate attributeName="rx" values="50;60;50" dur="7s" repeatCount="indefinite" />
        <animate attributeName="ry" values="30;40;30" dur="11s" repeatCount="indefinite" />
      </ellipse>
    </svg>
  </div>
);

const MusicHub = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [dbTracks, setDbTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [viewMode, setViewMode] = useState<"library" | "search">("library");
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
  const fetchDbTracks = useCallback(async () => {
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
        setDbTracks(mapped);
        setFilteredTracks(mapped);
        setQueue(mapped);
      } else {
        setDbTracks([]);
        setFilteredTracks([]);
      }
    } catch (err) {
      console.error("[v0] Failed to fetch tracks:", err);
      toast.error("Failed to load music tracks");
    } finally {
      setLoading(false);
    }
  }, [setQueue]);

  useEffect(() => { fetchDbTracks(); }, [fetchDbTracks]);

  // YouTube Search API
  const searchYouTube = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    setViewMode("search");
    
    try {
      const searchTerm = `${query} official audio`;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(searchTerm)}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`
      );
      
      if (!response.ok) throw new Error("YouTube API request failed");
      
      const data = await response.json();
      const results = (data.items || []).map(mapYouTubeResult);
      setSearchResults(results);
      setQueue(results);
    } catch (err) {
      console.error("[v0] YouTube search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }, [setQueue]);

  // Search for genre-specific top hits
  const searchGenreHits = useCallback(async (genre: string) => {
    if (genre === "All") {
      setViewMode("library");
      setFilteredTracks(dbTracks);
      return;
    }
    
    // First filter local DB
    const localFiltered = dbTracks.filter(t => t.genre === genre);
    if (localFiltered.length > 0) {
      setFilteredTracks(localFiltered);
      setViewMode("library");
      return;
    }
    
    // If no local tracks, search YouTube
    await searchYouTube(`${genre} music top hits 2024`);
  }, [dbTracks, searchYouTube]);

  // Browse Global Hits
  const browseGlobalHits = useCallback(async () => {
    await searchYouTube("Top 50 Global Hits 2024 music");
  }, [searchYouTube]);

  // Filter tracks by search and genre (for library mode)
  useEffect(() => {
    if (viewMode !== "library") return;
    
    let result = dbTracks;
    
    if (searchQuery.trim() && !searchResults.length) {
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
  }, [dbTracks, searchQuery, selectedGenre, viewMode, searchResults.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchYouTube(searchQuery);
    }
  };

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

  const displayTracks = viewMode === "search" ? searchResults : filteredTracks;
  const isLoading = loading || searchLoading;

  // Playlist view
  if (showPlaylists) {
    return (
      <>
        <LiquidGlassBackground />
        <div className="min-h-screen pb-32 relative z-10">
          <Header />
          <main className="container mx-auto px-4 py-6 max-w-2xl">
            <div className="liquid-glass-card rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF00FF] to-[#2D004F] flex items-center justify-center">
                    <ListMusic className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">My Playlists</h1>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPlaylists(false)} className="liquid-glass-card-light border-white/10 text-white hover:bg-white/10">
                  Back to Music
                </Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="New playlist name..." 
                  value={newPlaylistName} 
                  onChange={e => setNewPlaylistName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createPlaylist()} 
                  className="flex-1 liquid-glass-card-light border-white/10 focus:border-[#FF00FF]/50 text-white placeholder:text-white/40" 
                />
                <Button onClick={createPlaylist} size="icon" disabled={!newPlaylistName.trim()} className="bg-gradient-to-r from-[#FF00FF] to-[#2D004F] hover:opacity-90">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {playlists.length === 0 ? (
              <div className="liquid-glass-card rounded-2xl p-12 text-center">
                <ListMusic className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No playlists yet. Create one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlists.map(pl => {
                  const songs = playlistSongs[pl.id] || [];
                  const isExpanded = selectedPlaylistId === pl.id;
                  return (
                    <Card key={pl.id} className="liquid-glass-card border-white/10 hover:border-[#FF00FF]/30 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">{pl.name}</h3>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => playPlaylist(pl.id)} className="text-white hover:bg-[#FF00FF]/20">
                              <Play className="h-4 w-4 mr-1" /> Play
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20" onClick={() => deletePlaylist(pl.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-white/50">{songs.length} tracks</p>
                        <Button size="sm" variant="ghost" className="mt-1 text-xs text-white/60 hover:bg-white/5" onClick={() => {
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
                                  <p className="text-xs font-medium truncate text-white">{s.title}</p>
                                  <p className="text-[10px] text-white/50 truncate">{s.artist}</p>
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-500/20" onClick={e => { e.stopPropagation(); removeSongFromPlaylist(s.id, pl.id); }}>
                                  <Trash2 className="h-3 w-3 text-red-400" />
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
      </>
    );
  }

  return (
    <>
      <LiquidGlassBackground />
      <div className="min-h-screen pb-32 relative z-10">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Header Section with Liquid Glass */}
          <div className="liquid-glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF00FF] to-[#2D004F] flex items-center justify-center shadow-lg shadow-[#FF00FF]/20">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF00FF] to-white bg-clip-text text-transparent">
                    Prime Music
                  </h1>
                  <p className="text-xs text-white/50">Global streaming player</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPlaylists(true)}
                className="liquid-glass-card-light border-white/10 text-white hover:bg-white/10 hover:border-[#FF00FF]/30"
              >
                <ListMusic className="h-4 w-4 mr-1" /> Playlists
              </Button>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input 
                  placeholder="Search songs, artists on YouTube..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 liquid-glass-card-light border-white/10 focus:border-[#FF00FF]/50 transition-colors text-white placeholder:text-white/40" 
                />
              </div>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-[#FF00FF] to-[#2D004F] hover:opacity-90"
                disabled={searchLoading}
              >
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {/* Genre Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => {
                    setSelectedGenre(genre);
                    searchGenreHits(genre);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedGenre === genre
                      ? "bg-gradient-to-r from-[#FF00FF] to-[#2D004F] text-white shadow-lg shadow-[#FF00FF]/20"
                      : "liquid-glass-card-light text-white/60 hover:text-white hover:border-[#FF00FF]/30"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#FF00FF]/20 flex items-center justify-center">
              {viewMode === "search" ? (
                <Globe className="h-4 w-4 text-[#FF00FF]" />
              ) : (
                <TrendingUp className="h-4 w-4 text-[#FF00FF]" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">
              {viewMode === "search" 
                ? "Global Search Results" 
                : selectedGenre !== "All" 
                  ? selectedGenre 
                  : "Trending Now"}
            </h2>
            <span className="text-sm text-white/50">
              ({displayTracks.length} tracks)
            </span>
            {viewMode === "search" && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setViewMode("library");
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                Back to Library
              </Button>
            )}
          </div>

          {/* Track List */}
          {isLoading ? (
            <div className="liquid-glass-card rounded-2xl p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF00FF] mb-4" />
              <p className="text-white/60">{searchLoading ? "Searching global library..." : "Loading tracks..."}</p>
            </div>
          ) : displayTracks.length === 0 ? (
            <div className="liquid-glass-card rounded-2xl p-12 text-center">
              <Music className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60 mb-4">
                {viewMode === "search" 
                  ? "No results found. Try a different search." 
                  : "No music tracks yet"}
              </p>
              <Button 
                onClick={browseGlobalHits}
                className="bg-gradient-to-r from-[#FF00FF] to-[#2D004F] hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Browse Global Hits
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTracks.map((track, i) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <Card 
                    key={track.id} 
                    className={`liquid-glass-card border-white/10 cursor-pointer transition-all hover:border-[#FF00FF]/30 hover:shadow-lg hover:shadow-[#FF00FF]/10 ${
                      isActive ? "ring-2 ring-[#FF00FF]/50 border-[#FF00FF]/50" : ""
                    }`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Track Number */}
                      <span className="text-sm font-bold text-white/40 w-6 text-right">
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
                          <div className="w-full h-full bg-gradient-to-br from-[#FF00FF]/30 to-[#2D004F]/30 flex items-center justify-center">
                            <Music className="h-6 w-6 text-white/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                        <p className="text-sm font-medium truncate text-white">{track.title}</p>
                        <p className="text-xs text-white/50 truncate">{track.artist}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {track.genre && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF00FF]/20 text-[#FF00FF]">
                              {track.genre}
                            </span>
                          )}
                          {track.durationSeconds && (
                            <span className="text-[10px] text-white/40">
                              {formatDuration(track.durationSeconds)}
                            </span>
                          )}
                          {track.playCount && (
                            <span className="text-[10px] text-white/40 flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              {formatPlayCount(track.playCount)}
                            </span>
                          )}
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
                                className="h-8 w-8 hover:bg-[#FF00FF]/20 text-white/60" 
                                onClick={e => e.stopPropagation()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xs liquid-glass-card border-white/10" onClick={e => e.stopPropagation()}>
                              <DialogHeader>
                                <DialogTitle className="text-white">Add to Playlist</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 mt-2">
                                {playlists.map(pl => (
                                  <button 
                                    key={pl.id} 
                                    onClick={() => addToPlaylist(pl.id, track)}
                                    className="w-full text-left p-3 rounded-lg liquid-glass-card-light hover:border-[#FF00FF]/30 border border-white/10 transition-colors"
                                  >
                                    <p className="font-medium text-sm text-white">{pl.name}</p>
                                  </button>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        <button 
                          onClick={() => handleTrackClick(track)} 
                          className="p-2 rounded-full hover:bg-[#FF00FF]/20 transition-colors"
                        >
                          {isActive && isPlaying ? (
                            <Pause className="h-5 w-5 text-[#FF00FF]" />
                          ) : (
                            <Play className="h-5 w-5 text-[#FF00FF]" />
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
    </>
  );
};

export default MusicHub;
