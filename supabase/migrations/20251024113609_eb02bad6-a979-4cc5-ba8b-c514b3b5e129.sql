-- Create reels table
CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  duration integer,
  views integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Reels policies
CREATE POLICY "Reels are viewable by everyone"
  ON public.reels FOR SELECT
  USING (true);

CREATE POLICY "Users can create own reels"
  ON public.reels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reels"
  ON public.reels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reels"
  ON public.reels FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_reels_updated_at
  BEFORE UPDATE ON public.reels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for reels
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels', 'reels', true);

-- Storage policies for reels bucket
CREATE POLICY "Reel videos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

CREATE POLICY "Users can upload reel videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reels' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own reel videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'reels' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own reel videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reels' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );