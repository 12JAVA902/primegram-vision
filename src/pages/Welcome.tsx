import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import primegramLogo from "@/assets/primegram-logo.png";

const Welcome = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2500);
    const navTimer = setTimeout(() => navigate("/landing"), 3200);
    return () => {
      clearTimeout(timer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(291,64%,20%)] via-[hsl(340,82%,30%)] to-[hsl(25,95%,30%)] transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-pulse mb-8">
        <div className="bg-gradient-to-tr from-[hsl(291,64%,42%)] via-[hsl(340,82%,52%)] to-[hsl(25,95%,53%)] p-4 rounded-3xl shadow-2xl">
          <img src={primegramLogo} alt="Primegram" className="h-16 w-16" width={64} height={64} />
        </div>
      </div>

      <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
        Primegram
      </h1>

      <p className="text-white/70 text-lg mb-4">
        Share Your Moments
      </p>

      <p className="text-white/40 text-sm mb-12">
        Sponsored by <span className="text-white/70 font-semibold">JAVA PRIME</span> & <span className="text-white/70 font-semibold">JP7 ULTRA</span>
      </p>

      <div className="absolute bottom-8 text-center">
        <p className="text-white/50 text-sm">Created by</p>
        <p className="text-white font-semibold text-lg tracking-wide">
          Javan Omeri
        </p>
      </div>
    </div>
  );
};

export default Welcome;
