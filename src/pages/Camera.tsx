import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Camera as CameraIcon, RotateCw, Sparkles, X, Check, Loader2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Camera = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(8);
  const [captured, setCaptured] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [ready, setReady] = useState(false);

  const start = async (mode: "user" | "environment") => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // Try native zoom range
      const track = stream.getVideoTracks()[0] as any;
      const caps = track.getCapabilities?.();
      if (caps?.zoom) setMaxZoom(Math.max(caps.zoom.max, 8));
      setReady(true);
    } catch (e: any) {
      toast.error(e?.message || "Camera access denied");
    }
  };

  useEffect(() => {
    start(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // Apply zoom: prefer native track zoom, fallback to CSS transform
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks?.()[0] as any;
    const caps = track?.getCapabilities?.();
    if (caps?.zoom) {
      const z = Math.min(Math.max(zoom, caps.zoom.min), caps.zoom.max);
      track.applyConstraints({ advanced: [{ zoom: z }] }).catch(() => {});
    }
  }, [zoom]);

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    // Software zoom fallback: crop the center based on current zoom factor
    const cropW = w / zoom;
    const cropH = h / zoom;
    const sx = (w - cropW) / 2;
    const sy = (h - cropH) / 2;
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, sx, sy, cropW, cropH, 0, 0, w, h);
    const data = c.toDataURL("image/jpeg", 0.92);
    setCaptured(data);
  };

  const retake = () => {
    setCaptured(null);
    setZoom(1);
  };

  const enhance = async () => {
    if (!captured) return;
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-enhance", {
        body: { image: captured, prompt: "Enhance this photo: make it photorealistic, sharper, with natural lighting and vibrant true-to-life colors. Keep the subject identical." },
      });
      if (error) throw error;
      if (data?.image) {
        setCaptured(data.image);
        toast.success("Enhanced ✨");
      } else {
        throw new Error(data?.error || "No image returned");
      }
    } catch (e: any) {
      toast.error(e?.message || "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  };

  const usePhoto = () => {
    if (!captured) return;
    sessionStorage.setItem("camera_capture", captured);
    navigate("/create");
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {captured ? (
        <>
          <img src={captured} alt="Captured" className="flex-1 w-full object-contain bg-black" />
          <div className="p-4 flex items-center justify-between gap-3 bg-black/90 safe-bottom">
            <Button variant="ghost" size="icon" onClick={retake} className="text-white h-12 w-12 rounded-full">
              <RotateCw className="h-6 w-6" />
            </Button>
            <Button onClick={enhance} disabled={enhancing} variant="secondary" className="rounded-full px-5 gap-2">
              {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {enhancing ? "Enhancing..." : "AI Enhance"}
            </Button>
            <Button onClick={usePhoto} className="rounded-full px-6 gap-2 bg-gradient-to-r from-primary to-accent">
              <Check className="h-5 w-5" /> Use
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: `${facing === "user" ? "scaleX(-1)" : ""} scale(${zoom})`,
                transformOrigin: "center",
                transition: "transform 120ms ease-out",
              }}
            />
            <button
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center"
              aria-label="Flip camera"
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <div className="absolute top-1/2 -translate-y-1/2 right-3 h-1/2 flex flex-col items-center gap-2 bg-black/40 rounded-full px-2 py-3 backdrop-blur">
              <ZoomIn className="h-4 w-4 text-white" />
              <Slider
                orientation="vertical"
                min={1}
                max={maxZoom}
                step={0.1}
                value={[zoom]}
                onValueChange={(v) => setZoom(v[0])}
                className="h-full"
              />
              <span className="text-[11px] text-white font-mono">{zoom.toFixed(1)}x</span>
            </div>
          </div>
          <div className="p-6 flex items-center justify-center bg-black/90 safe-bottom">
            <button
              onClick={capture}
              disabled={!ready}
              aria-label="Capture"
              className="h-20 w-20 rounded-full border-4 border-white bg-white/20 active:bg-white/40 transition-colors flex items-center justify-center"
            >
              <CameraIcon className="h-8 w-8 text-white" />
            </button>
          </div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;
