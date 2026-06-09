import { useEffect, useState } from "react";
import { Users, MessageCircle, Settings, Wallet } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";

export const Header = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-500 ${
        scrolled
          ? "bg-transparent backdrop-blur-md border-transparent"
          : "glass border-border"
      }`}
    >
      <div className="container mx-auto px-4 h-14 flex items-center justify-between relative">
        <div
          className={`transition-all duration-500 ease-out ${
            scrolled
              ? "absolute left-1/2 -translate-x-1/2 opacity-90"
              : "relative translate-x-0"
          }`}
        >
          <Logo />
        </div>
        <nav
          className={`flex items-center gap-5 transition-opacity duration-500 ${
            scrolled ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Link to="/trading" className={`transition-colors hover:text-primary ${isActive("/trading") ? "text-primary" : "text-muted-foreground"}`}>
            <Wallet className="h-6 w-6" />
          </Link>
          <Link to="/people" className={`transition-colors hover:text-primary ${isActive("/people") ? "text-primary" : "text-muted-foreground"}`}>
            <Users className="h-6 w-6" />
          </Link>
          <Link to="/messages" className={`transition-colors hover:text-primary ${isActive("/messages") ? "text-primary" : "text-muted-foreground"}`}>
            <MessageCircle className="h-6 w-6" />
          </Link>
          <Link to="/settings" className={`transition-colors hover:text-primary ${isActive("/settings") ? "text-primary" : "text-muted-foreground"}`}>
            <Settings className="h-6 w-6" />
          </Link>
        </nav>
      </div>
    </header>
  );
};
