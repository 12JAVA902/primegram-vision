import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Music, Trophy, Plus, X } from "lucide-react";

export const FloatingHub = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Hide on full-screen experiences
  if (location.pathname.startsWith("/reels") || location.pathname.startsWith("/messages"))
    return null;

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
        className="liquid-glass h-12 w-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  );
};
