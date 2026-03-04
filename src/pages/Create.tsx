import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PrimeAI } from "@/components/PrimeAI";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FILTERS = [
  { name: "Normal", css: "" },
  { name: "Warm", css: "sepia(30%) saturate(140%) brightness(110%)" },
  { name: "Cool", css: "saturate(80%) hue-rotate(20deg) brightness(105%)" },
  { name: "Vintage", css: "sepia(50%) contrast(90%) brightness(90%)" },
  { name: "B&W", css: "grayscale(100%)" },
  { name: "Vivid", css: "saturate(180%) contrast(110%)" },
  { name: "Fade", css: "contrast(80%) brightness(115%) saturate(70%)" },
  { name: "Drama", css: "contrast(130%) brightness(90%) saturate(120%)" },
];

const Create = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith("video/")) {
        setMediaType("video");
      } else {
        setMediaType("image");
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setSelectedFilter(0);
    }
  };

  const applyFilterAndGetBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!preview) return reject("No image");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = FILTERS[selectedFilter].css || "none";
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject("Failed"), "image/jpeg", 0.9);
      };
      img.src = preview;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setLoading(true);
    try {
      if (mediaType === "video") {
        const fileName = `${user.id}/${Math.random()}.mp4`;
        const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("posts").getPublicUrl(fileName);
        const { error: insertError } = await supabase.from("posts").insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          video_url: urlData.publicUrl,
          media_type: "video",
          caption,
        });
        if (insertError) throw insertError;
      } else {
        const blob = selectedFilter > 0 ? await applyFilterAndGetBlob() : file;
        const fileName = `${user.id}/${Math.random()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("posts").upload(fileName, blob);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("posts").getPublicUrl(fileName);
        const { error: insertError } = await supabase.from("posts").insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          media_type: "image",
          caption,
        });
        if (insertError) throw insertError;
      }
      toast.success("Post created successfully!");
      navigate("/home");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                >
                  {preview ? (
                    mediaType === "video" ? (
                      <video src={preview} className="w-full h-full object-cover rounded-lg" controls muted />
                    ) : (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                        style={{ filter: FILTERS[selectedFilter].css || "none" }}
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">Upload image or video</p>
                    </div>
                  )}
                  <Input id="file-upload" type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} required />
                </label>

                {preview && mediaType === "image" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Filters</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {FILTERS.map((filter, i) => (
                        <button
                          key={filter.name}
                          type="button"
                          onClick={() => setSelectedFilter(i)}
                          className={`flex-shrink-0 flex flex-col items-center gap-1 ${selectedFilter === i ? "ring-2 ring-primary rounded-lg" : ""}`}
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden">
                            <img src={preview} alt={filter.name} className="w-full h-full object-cover" style={{ filter: filter.css || "none" }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{filter.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="resize-none" />
              </div>

              <Button type="submit" disabled={!file || loading} className="w-full bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] hover:opacity-90 transition-opacity">
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</>) : "Share Post"}
              </Button>
            </form>
            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>
      </main>
      <PrimeAI />
      <BottomNav />
    </div>
  );
};

export default Create;
