import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_notifications",
  title: "List my notifications",
  description: "List the signed-in user's recent Primegram notifications, optionally only unread ones.",
  inputSchema: {
    unread_only: z.boolean().optional().describe("Only return unread notifications."),
    limit: z.number().int().min(1).max(50).optional().describe("How many to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unread_only, limit }, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("notifications")
      .select("id, type, title, body, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (unread_only) q = q.eq("read", false);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const notifications = (data ?? []).map((n) => ({
      id: n.id as string,
      type: n.type as string,
      title: n.title as string,
      body: (n.body ?? null) as string | null,
      read: Boolean(n.read),
      created_at: String(n.created_at),
    }));
    return { content: [{ type: "text", text: JSON.stringify(notifications) }], structuredContent: { notifications } };
  },
});
