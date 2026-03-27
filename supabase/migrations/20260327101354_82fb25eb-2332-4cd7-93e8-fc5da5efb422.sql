
CREATE TABLE public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view groups" ON public.chat_groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = chat_groups.id AND user_id = auth.uid()));

CREATE POLICY "Authenticated users can create groups" ON public.chat_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update" ON public.chat_groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Group creator can delete" ON public.chat_groups FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Members can view group members" ON public.chat_group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = chat_group_members.group_id AND m.user_id = auth.uid()));

CREATE POLICY "Group creator or admins can add members" ON public.chat_group_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_groups WHERE id = group_id AND created_by = auth.uid())
    OR auth.uid() = user_id
  );

CREATE POLICY "Members can leave" ON public.chat_group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.chat_groups WHERE id = group_id AND created_by = auth.uid()));

CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

CREATE POLICY "Members can send group messages" ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
