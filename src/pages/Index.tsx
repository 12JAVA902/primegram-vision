import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="text-center space-y-8 p-8">
        <div className="flex justify-center mb-8">
          <Logo className="scale-150" />
        </div>
        
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] bg-clip-text text-transparent">
          Share Your Moments
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Connect with friends and share your life through photos on Primegram
        </p>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] hover:opacity-90 transition-opacity px-8"
            size="lg"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
