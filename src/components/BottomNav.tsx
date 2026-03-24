import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: "/home", icon: Home, label: "Home" },
    { to: "/explore", icon: Search, label: "Search" },
    { to: "/create", icon: PlusSquare, label: "Create" },
    { to: "/notifications", icon: Heart, label: "Notifications" },
    { to: `/profile/${user?.id}`, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={label}
            to={to}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors hover:text-primary ${
              isActive(to) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
          </Link>
        ))}
      </div>
    </nav>
  );
};
