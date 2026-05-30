
-- 1) Wallet: remove client-side UPDATE policy; balance changes must go through server-side function
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

CREATE OR REPLACE FUNCTION public.transfer_funds(_to_user uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from uuid := auth.uid();
  _from_balance numeric;
BEGIN
  IF _from IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _to_user = _from THEN RAISE EXCEPTION 'Cannot transfer to self'; END IF;

  SELECT balance INTO _from_balance FROM public.wallets WHERE user_id = _from FOR UPDATE;
  IF _from_balance IS NULL THEN RAISE EXCEPTION 'Sender wallet not found'; END IF;
  IF _from_balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.wallets SET balance = balance - _amount, updated_at = now() WHERE user_id = _from;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now() WHERE user_id = _to_user;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_funds(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, numeric) TO authenticated;

-- 2) Admin users: remove self-referential INSERT policy; only service_role may grant admin.
DROP POLICY IF EXISTS "Admins can insert admin_users" ON public.admin_users;
-- (No public INSERT/UPDATE/DELETE policies remain; only service_role can mutate.)

-- 3) Chat group members: remove the OR (auth.uid() = user_id) self-join bypass
DROP POLICY IF EXISTS "Group creator or admins can add members" ON public.chat_group_members;
CREATE POLICY "Group creator can add members"
ON public.chat_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE chat_groups.id = chat_group_members.group_id
      AND chat_groups.created_by = auth.uid()
  )
);

-- 4) Profiles: prevent email-formatted usernames; sanitize any existing ones.
UPDATE public.profiles
SET username = 'user_' || substr(md5(id::text || username), 1, 10)
WHERE username LIKE '%@%';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_no_email;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_no_email
  CHECK (position('@' in username) = 0);

-- 6) Auto-delete expired stories + their storage objects
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  obj_path text;
BEGIN
  FOR r IN
    SELECT id, image_url FROM public.stories WHERE expires_at < now()
  LOOP
    -- Extract object path after "/storage/v1/object/public/posts/"
    obj_path := regexp_replace(r.image_url, '^.*/storage/v1/object/public/posts/', '');
    IF obj_path <> r.image_url THEN
      DELETE FROM storage.objects WHERE bucket_id = 'posts' AND name = obj_path;
    END IF;
    DELETE FROM public.stories WHERE id = r.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_stories() FROM PUBLIC;

-- Schedule daily cleanup via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup_expired_stories_daily';
    PERFORM cron.schedule(
      'cleanup_expired_stories_daily',
      '0 3 * * *',
      $cron$ SELECT public.cleanup_expired_stories(); $cron$
    );
  END IF;
END $$;
