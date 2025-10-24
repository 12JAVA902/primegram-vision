import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";

const Notifications = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No notifications yet. Start following people and interacting with posts!
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Notifications;
