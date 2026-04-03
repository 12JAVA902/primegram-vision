import { corsHeaders } from "@supabase/supabase-js/cors";

const DEEZER_API = "https://api.deezer.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let apiUrl: string;

    if (action === "search") {
      const query = url.searchParams.get("q");
      if (!query || query.length > 200) {
        return new Response(JSON.stringify({ error: "Invalid query" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=25`;
    } else if (action === "chart") {
      const genreId = url.searchParams.get("genre_id") || "0";
      if (!/^\d+$/.test(genreId)) {
        return new Response(JSON.stringify({ error: "Invalid genre_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      apiUrl = `${DEEZER_API}/chart/${genreId}/tracks?limit=25`;
    } else if (action === "genres") {
      apiUrl = `${DEEZER_API}/genre`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Music search error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch music data" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
