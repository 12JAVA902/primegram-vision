import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { LiquidBackground } from "@/components/LiquidBackground";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { UniversalMusicPlayer } from "@/components/UniversalMusicPlayer";
import Welcome from "./pages/Welcome";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Create from "./pages/Create";
import Explore from "./pages/Explore";
import Reels from "./pages/Reels";
import ReelsDashboard from "./pages/ReelsDashboard";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import MusicHub from "./pages/MusicHub";
import Appearance from "./pages/Appearance";
import PrivacySecurity from "./pages/PrivacySecurity";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Trading from "./pages/Trading";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MusicPlayerProvider>
        <TooltipProvider>
          <LiquidBackground />
          <Toaster />
          <Sonner />
          <RealtimeNotifications />
          <UniversalMusicPlayer />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/landing" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/create" element={<Create />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/reels" element={<Reels />} />
              <Route path="/reels/dashboard" element={<ReelsDashboard />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/appearance" element={<Appearance />} />
              <Route path="/settings/privacy" element={<PrivacySecurity />} />
              <Route path="/music" element={<MusicHub />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </MusicPlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
