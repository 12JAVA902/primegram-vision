
-- 1) Wallets INSERT: lock starting balance to 10000.00
DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "wallets_insert_own" ON public.wallets;

CREATE POLICY "Users can create own wallet with default balance"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND balance = 10000.00);

-- 2) Notifications INSERT: require a real relationship between sender and recipient
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Senders can notify self or connected users"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = from_user_id
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows
      WHERE (follower_id = auth.uid() AND following_id = user_id)
         OR (follower_id = user_id      AND following_id = auth.uid())
    )
  )
);

-- 3) Lock down SECURITY DEFINER function execution
-- Revoke broad execute, grant back only what end-users need to call.
REVOKE EXECUTE ON FUNCTION public.handle_new_wallet()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_wallet_defaults() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_stories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_funds(uuid, numeric) FROM PUBLIC, anon;

-- transfer_funds is intentionally callable by signed-in users (validates auth.uid() internally)
GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, numeric) TO authenticated;
