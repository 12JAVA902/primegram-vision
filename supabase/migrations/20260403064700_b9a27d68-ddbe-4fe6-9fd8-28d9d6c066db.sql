
-- Drop and recreate the SELECT policy on chat_groups to also allow creator
DROP POLICY IF EXISTS "Members can view groups" ON public.chat_groups;

CREATE POLICY "Members or creator can view groups"
ON public.chat_groups
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE chat_group_members.group_id = chat_groups.id
    AND chat_group_members.user_id = auth.uid()
  )
);
