const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "YouTube API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "search") {
      const query = url.searchParams.get("q");
      if (!query || query.length > 200) {
        return new Response(JSON.stringify({ error: "Invalid query" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const apiUrl = `${YOUTUBE_API}/search?part=snippet&type=video&videoCategoryId=10&maxResults=25&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "trending") {
      const apiUrl = `${YOUTUBE_API}/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=25&regionCode=US&key=${apiKey}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "related") {
      const videoId = url.searchParams.get("videoId");
      if (!videoId) {
        return new Response(JSON.stringify({ error: "Missing videoId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // YouTube removed the relatedToVideoId param; use search with the video title instead
      // First get the video details
      const detailUrl = `${YOUTUBE_API}/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${apiKey}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      const title = detailData.items?.[0]?.snippet?.title || "";
      // Search for similar music
      const searchTerms = title.replace(/\(.*?\)|\[.*?\]/g, "").trim().split(" ").slice(0, 4).join(" ");
      const searchUrl = `${YOUTUBE_API}/search?part=snippet&type=video&videoCategoryId=10&maxResults=15&q=${encodeURIComponent(searchTerms + " music")}&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      // Filter out the current video
      if (searchData.items) {
        searchData.items = searchData.items.filter((item: any) => {
          const id = typeof item.id === "string" ? item.id : item.id?.videoId;
          return id !== videoId;
        });
      }
      return new Response(JSON.stringify(searchData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use: search, trending, related" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("YouTube music error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch YouTube data" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
