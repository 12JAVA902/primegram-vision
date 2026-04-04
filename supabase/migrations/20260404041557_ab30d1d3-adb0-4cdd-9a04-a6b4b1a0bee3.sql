
-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;

-- Owner can always see their stories
CREATE POLICY "Owners can view own stories"
ON public.stories FOR SELECT
USING (auth.uid() = user_id);

-- Others can only see non-expired stories
CREATE POLICY "Public can view active stories"
ON public.stories FOR SELECT
USING (expires_at > now());
