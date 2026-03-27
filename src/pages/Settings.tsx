import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogOut, User, Shield, Bell, Palette, Info, Download, Music, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const menuItems = [
    { icon: User, label: "Edit Profile", onClick: () => navigate(`/profile/${user?.id}`) },
    { icon: Bell, label: "Notifications", onClick: () => navigate("/notifications") },
    { icon: Palette, label: "Appearance", onClick: () => navigate("/settings/appearance") },
    { icon: Shield, label: "Privacy & Security", onClick: () => navigate("/settings/privacy") },
    { icon: Music, label: "Music Hub", onClick: () => navigate("/music") },
    { icon: ShieldCheck, label: "Admin Panel", onClick: () => navigate("/admin") },
    { icon: Download, label: "Download APK", onClick: () => toast.info("APK download will be available soon. Check back later!") },
    { icon: Info, label: "About Primegram", onClick: () => toast.info("Primegram v1.0 — Sponsored by JAVA PRIME & JP7 ULTRA") },
  ];

  return (
    <div className="min-h-screen pb-16 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Card className="mb-6">
          <CardContent className="p-0">
            {menuItems.map(({ icon: Icon, label, onClick }, i) => (
              <button
                key={label}
                onClick={onClick}
                className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-accent transition-colors ${
                  i < menuItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sponsored by <span className="font-semibold">JAVA PRIME</span> & <span className="font-semibold">JP7 ULTRA</span>
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default Settings;
