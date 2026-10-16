import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's Primegram profile (username, name, bio, website).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, bio, website, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Profile not found");
    const profile = {
      id: data.id as string,
      username: data.username as string,
      full_name: (data.full_name ?? null) as string | null,
      bio: (data.bio ?? null) as string | null,
      website: (data.website ?? null) as string | null,
      avatar_url: (data.avatar_url ?? null) as string | null,
    };
    return { content: [{ type: "text", text: JSON.stringify(profile) }], structuredContent: { profile } };
  },
});
