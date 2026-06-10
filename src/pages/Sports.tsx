import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SportEvent {
  idEvent: string;
  strEvent: string;
  strLeague: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string;
  strTime: string;
  strStatus?: string;
  strThumb?: string | null;
}

// Free TheSportsDB test key "3" — limited but no signup needed
const LEAGUES = [
  { id: "4328", name: "Premier League" },
  { id: "4335", name: "La Liga" },
  { id: "4332", name: "Serie A" },
  { id: "4387", name: "NBA" },
  { id: "4391", name: "NFL" },
];

const Sports = () => {
  const [tab, setTab] = useState<"live" | "upcoming">("live");
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = tab === "live" ? "eventspastleague" : "eventsnextleague";
      const results = await Promise.all(
        LEAGUES.map((l) =>
          fetch(`https://www.thesportsdb.com/api/v1/json/3/${endpoint}.php?id=${l.id}`)
            .then((r) => r.json())
            .then((d) => d.events || [])
            .catch(() => [])
        )
      );
      const merged: SportEvent[] = results.flat();
      merged.sort((a, b) =>
        (b.dateEvent || "").localeCompare(a.dateEvent || "")
      );
      setEvents(merged.slice(0, 40));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="min-h-screen pb-28 relative z-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-[hsl(25,95%,53%)]" />
            <h1 className="text-2xl font-bold">Sports</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={tab === "live" ? "default" : "outline"}
            onClick={() => setTab("live")}
            className={tab === "live" ? "bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)]" : ""}
          >
            Recent results
          </Button>
          <Button
            size="sm"
            variant={tab === "upcoming" ? "default" : "outline"}
            onClick={() => setTab("upcoming")}
            className={tab === "upcoming" ? "bg-gradient-to-r from-primary via-accent to-[hsl(25,95%,53%)]" : ""}
          >
            Upcoming
          </Button>
        </div>

        {loading && events.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No fixtures available</p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.idEvent} className="p-4">
                <p className="text-xs text-muted-foreground mb-2">{e.strLeague}</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{e.strHomeTeam}</p>
                    <p className="font-semibold truncate text-muted-foreground">{e.strAwayTeam}</p>
                  </div>
                  <div className="text-right">
                    {e.intHomeScore !== null && e.intAwayScore !== null ? (
                      <div>
                        <p className="text-xl font-bold">{e.intHomeScore}</p>
                        <p className="text-xl font-bold text-muted-foreground">{e.intAwayScore}</p>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <p>{e.dateEvent}</p>
                        <p>{e.strTime?.slice(0, 5)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Sports;
