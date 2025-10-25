import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Grid, Settings } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchPosts();
      fetchFollowStats();
      checkIfFollowing();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchFollowStats = async () => {
    try {
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      setFollowers(followersCount || 0);
      setFollowing(followingCount || 0);
    } catch (error) {
      console.error("Error fetching follow stats:", error);
    }
  };

  const checkIfFollowing = async () => {
    if (!user || isOwnProfile) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollow = async () => {
    if (!user) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowers((prev) => prev - 1);
        toast.success("Unfollowed");
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });

        if (error) throw error;
        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
        toast.success("Following");
      }
    } catch (error: any) {
      toast.error("Failed to update follow status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-start gap-8 mb-6">
            {isOwnProfile ? (
              <AvatarUpload
                userId={userId!}
                currentAvatarUrl={profile.avatar_url}
                username={profile.username}
                onUploadComplete={fetchProfile}
              />
            ) : (
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-3xl">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-2xl font-semibold">{profile.username}</h1>
                {isOwnProfile ? (
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className={
                      !isFollowing
                        ? "bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] hover:opacity-90"
                        : ""
                    }
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>

              <div className="flex gap-8 mb-4">
                <div>
                  <span className="font-semibold">{posts.length}</span> posts
                </div>
                <div>
                  <span className="font-semibold">{followers}</span> followers
                </div>
                <div>
                  <span className="font-semibold">{following}</span> following
                </div>
              </div>

              {profile.full_name && (
                <p className="font-semibold">{profile.full_name}</p>
              )}
              {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {profile.website}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-center gap-2 mb-6 text-sm font-semibold">
            <Grid className="h-4 w-4" />
            POSTS
          </div>

          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="aspect-square overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              </Card>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
