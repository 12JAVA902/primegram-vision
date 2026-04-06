-- Create music_tracks table for the Music Hub feature
CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art_url TEXT,
  genre TEXT,
  duration_seconds INTEGER,
  is_trending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read music tracks (public content)
CREATE POLICY "Allow public read access to music_tracks"
  ON music_tracks
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can insert/update/delete (for admin purposes)
CREATE POLICY "Allow authenticated users to manage music_tracks"
  ON music_tracks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
