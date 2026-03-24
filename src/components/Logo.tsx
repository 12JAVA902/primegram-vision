import primegramLogo from "@/assets/primegram-logo.png";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={primegramLogo}
        alt="Primegram"
        className="h-8 w-8 rounded-lg"
        width={32}
        height={32}
      />
      <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)] bg-clip-text text-transparent">
        Primegram
      </span>
    </div>
  );
};
