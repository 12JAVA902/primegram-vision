import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Music, Trophy, Sparkles, X } from "lucide-react";

export const FloatingHub = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Only render on the Home feed
  if (location.pathname !== "/home") return null;

  return (
    <div className="fixed right-4 bottom-40 z-40 flex flex-col items-end gap-3">
      {open && (
        <>
          <Link
            to="/sports"
            onClick={() => setOpen(false)}
            className="liquid-glass flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-medium animate-in slide-in-from-right-4 fade-in"
          >
            <Trophy className="h-5 w-5 text-[hsl(25,95%,53%)]" />
            Sports
          </Link>
          <Link
            to="/music"
            onClick={() => setOpen(false)}
            className="liquid-glass flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-medium animate-in slide-in-from-right-4 fade-in"
          >
            <Music className="h-5 w-5 text-primary" />
            Music Hub
          </Link>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick hub"
        className="relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-elevated transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-br from-primary via-accent to-[hsl(25,95%,53%)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:to-transparent before:opacity-50"
      >
        {open ? (
          <X className="h-6 w-6 text-white relative z-10" />
        ) : (
          <Sparkles className="h-6 w-6 text-white relative z-10 drop-shadow" />
        )}
      </button>
    </div>
  );
};
