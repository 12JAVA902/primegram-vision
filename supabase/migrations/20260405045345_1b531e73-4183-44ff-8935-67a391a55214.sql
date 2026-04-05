
-- Playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own playlists" ON public.playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON public.playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist songs join table
CREATE TABLE public.playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art TEXT,
  preview_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'deezer',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own playlist songs" ON public.playlist_songs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_songs.playlist_id AND playlists.user_id = auth.uid()));
CREATE POLICY "Users can add to own playlists" ON public.playlist_songs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_songs.playlist_id AND playlists.user_id = auth.uid()));
CREATE POLICY "Users can update own playlist songs" ON public.playlist_songs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_songs.playlist_id AND playlists.user_id = auth.uid()));
CREATE POLICY "Users can delete own playlist songs" ON public.playlist_songs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_songs.playlist_id AND playlists.user_id = auth.uid()));

-- Wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_wallet
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- Fix group members RLS: allow users to see their own membership rows
DROP POLICY IF EXISTS "Members can view group members" ON public.chat_group_members;
CREATE POLICY "Members can view group members" ON public.chat_group_members FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.chat_groups WHERE chat_groups.id = chat_group_members.group_id AND chat_groups.created_by = auth.uid()
    )
  );
