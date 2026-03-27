import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, KeyRound } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/home");
  }, [user, navigate]);

  const resolveEmail = async (identifier: string): Promise<string> => {
    // If it looks like an email, use directly
    if (identifier.includes("@")) return identifier;
    // Otherwise look up by username
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", identifier.replace("@", ""))
      .single();
    if (!data) throw new Error("User not found with that username");
    // We can't get email from profiles, so inform user
    throw new Error("Please sign in with your email address. Username login requires email.");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        let emailToUse = loginIdentifier;
        if (!loginIdentifier.includes("@")) {
          // Try username lookup
          throw new Error("Please use your email address to sign in.");
        }
        const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/home");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { username, full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    sessionStorage.setItem("guest_mode", "true");
    toast.success("Welcome, Guest! You can browse posts and videos.");
    navigate("/home");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <Card className="w-full max-w-md shadow-elevated bg-black/70 backdrop-blur-xl border border-white/10">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center"><Logo /></div>
          <CardTitle>Forgot Password</CardTitle>
            <CardDescription>Enter your email to receive a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)]" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setShowForgotPassword(false)} className="text-primary hover:underline text-sm">
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <Card className="w-full max-w-md shadow-elevated bg-black/70 backdrop-blur-xl border border-white/10">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center"><Logo /></div>
          <CardTitle className="text-2xl">{isLogin ? "Welcome back" : "Create an account"}</CardTitle>
          <CardDescription>{isLogin ? "Sign in to continue to Primegram" : "Sign up to start sharing your moments"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" type="text" placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{isLogin ? "Email / Username / Phone" : "Email"}</Label>
              {isLogin ? (
                <Input id="email" type="text" placeholder="Email, username, or phone" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} required />
              ) : (
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {isLogin && (
              <div className="text-right">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  Forgot password?
                </button>
              </div>
            )}
            <Button type="submit" className="w-full bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] hover:opacity-90 transition-opacity" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
          {isLogin && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleGuestLogin}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
              >
                Continue as Guest
              </button>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-border text-center">
            <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Shield className="h-4 w-4" />
              Administrator Login
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sponsored by <span className="font-semibold">JAVA PRIME</span> & <span className="font-semibold">JP7 ULTRA</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
