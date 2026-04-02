import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

export const StoriesBar = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profiles:user_id(username, avatar_url)")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setStories((data as any[]) || []);
  };

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB for stories
    if (file.size > MAX_SIZE) {
      toast.error("Image too large. Maximum size is 10MB.");
      return;
    }
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload an image.");
      return;
    }
    try {
      const fileName = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("posts").getPublicUrl(fileName);
      await supabase.from("stories").insert({ user_id: user.id, image_url: urlData.publicUrl });
      toast.success("Story posted!");
      fetchStories();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Group stories by user
  const userStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) acc[story.user_id] = [];
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  return (
    <>
      <div className="border-b border-border px-4 py-3 overflow-x-auto">
        <div className="flex gap-4 min-w-min">
          {/* Add story button */}
          {user && (
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarFallback>
                    <Plus className="h-6 w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[10px] text-muted-foreground">Your story</span>
            </button>
          )}
          <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddStory} />

          {Object.entries(userStories).map(([userId, userStoryList]) => {
            const latest = userStoryList[0];
            const profile = latest.profiles as any;
            return (
              <button
                key={userId}
                onClick={() => setViewingStory(latest)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <Avatar className="h-16 w-16 ring-2 ring-primary ring-offset-2 ring-offset-background">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">
                  {profile?.username}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Story viewer */}
      <Dialog open={!!viewingStory} onOpenChange={() => setViewingStory(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-black border-none">
          {viewingStory && (
            <div className="relative">
              <img src={viewingStory.image_url} alt="Story" className="w-full max-h-[80vh] object-contain" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(viewingStory.profiles as any)?.avatar_url || undefined} />
                  <AvatarFallback>{(viewingStory.profiles as any)?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium">{(viewingStory.profiles as any)?.username}</span>
              </div>
              {viewingStory.caption && (
                <div className="absolute bottom-4 left-4 right-4 text-white text-sm bg-black/50 rounded-lg px-3 py-2">
                  {viewingStory.caption}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
