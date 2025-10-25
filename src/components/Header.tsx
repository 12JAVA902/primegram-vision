import { Home, Search, PlusSquare, Heart, User, LogOut, Video, MessageCircle } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border backdrop-blur supports-[backdrop-filter]:bg-background/95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />
        
        <nav className="flex items-center gap-6">
          <Link
            to="/home"
            className={`transition-colors hover:text-primary ${
              isActive("/home") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Home className="h-6 w-6" />
          </Link>
          <Link
            to="/explore"
            className={`transition-colors hover:text-primary ${
              isActive("/explore") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Search className="h-6 w-6" />
          </Link>
          <Link
            to="/reels"
            className={`transition-colors hover:text-primary ${
              isActive("/reels") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Video className="h-6 w-6" />
          </Link>
          <Link
            to="/create"
            className={`transition-colors hover:text-primary ${
              isActive("/create") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <PlusSquare className="h-6 w-6" />
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
            to="/notifications"
            className={`transition-colors hover:text-primary ${
              isActive("/notifications") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Heart className="h-6 w-6" />
          </Link>
          <Link
            to={`/profile/${user?.id}`}
            className={`transition-colors hover:text-primary ${
              isActive(`/profile/${user?.id}`) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User className="h-6 w-6" />
          </Link>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </nav>
      </div>
    </header>
  );
};
