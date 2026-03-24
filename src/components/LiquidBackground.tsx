import { useEffect, useRef } from "react";

export const LiquidBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const blobs = [
      { x: 0.3, y: 0.3, r: 250, color: "291, 64%, 42%" },
      { x: 0.7, y: 0.5, r: 300, color: "340, 82%, 52%" },
      { x: 0.5, y: 0.8, r: 220, color: "25, 95%, 53%" },
      { x: 0.2, y: 0.7, r: 200, color: "260, 70%, 50%" },
      { x: 0.8, y: 0.2, r: 260, color: "310, 60%, 45%" },
    ];

    const animate = () => {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark base
      ctx.fillStyle = "hsl(0, 0%, 5%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob, i) => {
        const cx = canvas.width * blob.x + Math.sin(time * (0.7 + i * 0.3)) * 120;
        const cy = canvas.height * blob.y + Math.cos(time * (0.5 + i * 0.2)) * 100;
        const r = blob.r + Math.sin(time * (1 + i * 0.4)) * 40;

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `hsla(${blob.color}, 0.4)`);
        gradient.addColorStop(0.5, `hsla(${blob.color}, 0.15)`);
        gradient.addColorStop(1, `hsla(${blob.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
};
