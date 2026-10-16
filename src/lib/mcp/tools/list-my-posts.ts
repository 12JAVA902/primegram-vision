import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_posts",
  title: "List my posts",
  description: "List the signed-in user's most recent Primegram posts with captions and media links.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many posts to return (default 20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .select("id, caption, image_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) throw new ToolError(error.message);
    const posts = (data ?? []).map((p) => ({
      id: p.id as string,
      caption: (p.caption ?? null) as string | null,
      media_url: p.image_url as string,
      created_at: String(p.created_at),
    }));
    return { content: [{ type: "text", text: JSON.stringify(posts) }], structuredContent: { posts } };
  },
});
