import { useEffect, useState } from "react";
import { Home, Search, PlusSquare, User, Film } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: "/home", icon: Home, label: "Home" },
    { to: "/explore", icon: Search, label: "Search" },
    { to: "/reels", icon: Film, label: "Reels" },
    { to: "/create", icon: PlusSquare, label: "Create" },
    { to: `/profile/${user?.id}`, icon: User, label: "Profile" },
  ];

  return (
    <nav
      className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
        scrolled ? "bottom-6 scale-[0.96]" : "bottom-3 scale-100"
      }`}
    >
      <div
        className={`liquid-glass flex items-center justify-around gap-1 px-5 py-2 rounded-full transition-all duration-500 ${
          scrolled ? "opacity-70" : "opacity-100"
        }`}
        style={{ minWidth: "min(92vw, 360px)" }}
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={label}
            to={to}
            aria-label={label}
            className={`flex items-center justify-center h-11 w-11 rounded-full transition-all hover:text-primary ${
              isActive(to)
                ? "text-primary bg-white/10"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
          </Link>
        ))}
      </div>
    </nav>
  );
};
