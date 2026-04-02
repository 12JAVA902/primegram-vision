-- Create admin_users table for proper server-side admin auth
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see admin_users
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Admins can view admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin_users"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Fix notifications INSERT policy: require from_user_id = auth.uid()
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert notifications as sender"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);