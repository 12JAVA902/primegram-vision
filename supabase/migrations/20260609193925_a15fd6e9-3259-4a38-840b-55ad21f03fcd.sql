
-- 1. Wallet balance escalation: force default balance on insert
CREATE OR REPLACE FUNCTION public.enforce_wallet_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.balance := 10000.00;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_wallet_defaults_trg ON public.wallets;
CREATE TRIGGER enforce_wallet_defaults_trg
BEFORE INSERT ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.enforce_wallet_defaults();

-- Reset any wallets that were created with inflated balances by self-insert
-- (only touches rows that exceed the intended default)
UPDATE public.wallets SET balance = 10000.00 WHERE balance > 10000.00;

-- 2. Remove duplicate avatar storage policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;

-- 3. Restrict listing of public buckets — keep direct URL reads working,
--    but prevent enumerating bucket contents via the Storage API.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Reel videos are publicly accessible" ON storage.objects;

-- 4. Lock down SECURITY DEFINER functions
-- Internal-only (called by triggers/cron): revoke all execute
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_stories() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_wallet_defaults() FROM PUBLIC, anon, authenticated;

-- User-callable: restrict to authenticated only
REVOKE ALL ON FUNCTION public.transfer_funds(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
