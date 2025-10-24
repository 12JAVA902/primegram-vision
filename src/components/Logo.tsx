import { Instagram } from "lucide-react";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="bg-gradient-to-tr from-primary via-accent to-[hsl(25,95%,53%)] p-2 rounded-xl">
        <Instagram className="h-6 w-6 text-white" />
      </div>
      <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] bg-clip-text text-transparent">
        Primegram
      </span>
    </div>
  );
};
