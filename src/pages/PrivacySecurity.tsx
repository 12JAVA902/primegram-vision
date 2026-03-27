import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <div className="min-h-screen pb-16 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Privacy & Security</h1>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">Privacy</h2>
          <Card>
            <CardContent className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Private Account</p>
                    <p className="text-xs text-muted-foreground">Only approved followers can see your posts</p>
                  </div>
                </div>
                <Switch checked={privateAccount} onCheckedChange={(v) => { setPrivateAccount(v); toast.success(v ? "Account set to private" : "Account set to public"); }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showActivity ? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">Activity Status</p>
                    <p className="text-xs text-muted-foreground">Show when you're online</p>
                  </div>
                </div>
                <Switch checked={showActivity} onCheckedChange={(v) => { setShowActivity(v); toast.success(v ? "Activity visible" : "Activity hidden"); }} />
              </div>
            </CardContent>
          </Card>

          <h2 className="text-sm font-semibold text-muted-foreground uppercase mt-6">Security</h2>
          <Card>
            <CardContent className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Extra security for your account</p>
                  </div>
                </div>
                <Switch checked={twoFactor} onCheckedChange={(v) => { setTwoFactor(v); toast.success(v ? "2FA enabled" : "2FA disabled"); }} />
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/reset-password")}>
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default PrivacySecurity;
