import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const themes = [
  { name: "Default Dark", colors: "from-[hsl(291,64%,20%)] via-[hsl(340,82%,30%)] to-[hsl(25,95%,30%)]" },
  { name: "Midnight Blue", colors: "from-[hsl(220,60%,15%)] via-[hsl(230,50%,20%)] to-[hsl(240,40%,25%)]" },
  { name: "Forest Green", colors: "from-[hsl(140,40%,12%)] via-[hsl(160,35%,18%)] to-[hsl(180,30%,15%)]" },
  { name: "Warm Sunset", colors: "from-[hsl(20,60%,18%)] via-[hsl(340,50%,22%)] to-[hsl(280,40%,20%)]" },
];

const Appearance = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-16 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Appearance</h1>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">Theme</h2>
          {themes.map((theme) => (
            <Card
              key={theme.name}
              className="cursor-pointer hover:ring-1 hover:ring-primary transition-all"
              onClick={() => toast.success(`${theme.name} theme applied!`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${theme.colors}`} />
                <span className="font-medium">{theme.name}</span>
              </CardContent>
            </Card>
          ))}

          <h2 className="text-sm font-semibold text-muted-foreground uppercase mt-6">Display</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Font Size</span>
                <span className="text-sm text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reduce Motion</span>
                <span className="text-sm text-muted-foreground">Off</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Appearance;
