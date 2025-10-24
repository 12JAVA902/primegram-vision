import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Loader2, Video, Play } from "lucide-react";

const ReelsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("video/")) {
        toast.error("Please select a video file");
        return;
      }
      
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("reels")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("reels").insert({
        user_id: user.id,
        video_url: urlData.publicUrl,
        caption,
      });

      if (insertError) throw insertError;

      toast.success("Reel uploaded successfully!");
      navigate("/reels");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Form */}
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Video className="h-6 w-6 text-primary" />
                Create Reel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <label
                    htmlFor="video-upload"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                  >
                    {preview ? (
                      <div className="relative w-full h-full">
                        <video
                          src={preview}
                          className="w-full h-full object-cover"
                          controls
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground text-center">
                          Click to upload video
                          <br />
                          <span className="text-xs">MP4, MOV, AVI (max 100MB)</span>
                        </p>
                      </div>
                    )}
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileChange}
                      required
                    />
                  </label>

                  <Textarea
                    placeholder="Write a caption for your reel..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!file || loading}
                  className="w-full bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] hover:opacity-90 transition-opacity"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Reel"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tips & Stats */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Tips for Great Reels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Vertical Format</p>
                    <p className="text-muted-foreground">
                      9:16 aspect ratio works best for mobile viewing
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Short & Sweet</p>
                    <p className="text-muted-foreground">
                      15-30 seconds gets the best engagement
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Upload className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">High Quality</p>
                    <p className="text-muted-foreground">
                      Use good lighting and clear audio
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Reels</span>
                  <span className="font-bold text-2xl">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Views</span>
                  <span className="font-bold text-2xl">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg. Views</span>
                  <span className="font-bold text-2xl">-</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReelsDashboard;
