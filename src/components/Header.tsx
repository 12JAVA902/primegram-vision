import { Video, MessageCircle, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";

export const Header = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border backdrop-blur supports-[backdrop-filter]:bg-background/95">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-5">
          <Link
            to="/reels"
            className={`transition-colors hover:text-primary ${
              isActive("/reels") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Video className="h-6 w-6" />
          </Link>
          <Link
            to="/messages"
            className={`transition-colors hover:text-primary ${
              isActive("/messages") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MessageCircle className="h-6 w-6" />
          </Link>
          <Link
            to="/settings"
            className={`transition-colors hover:text-primary ${
              isActive("/settings") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Settings className="h-6 w-6" />
          </Link>
        </nav>
      </div>
    </header>
  );
};
