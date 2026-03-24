import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Phone, MessageCircle } from "lucide-react";

export const RealtimeNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls
    const callChannel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as any;
          if (call.status === "ringing") {
            toast.info(`Incoming ${call.call_type} call`, {
              duration: 10000,
              icon: <Phone className="h-5 w-5 text-green-500" />,
              action: {
                label: "View",
                onClick: () => window.location.assign("/messages"),
              },
            });
          }
        }
      )
      .subscribe();

    // Listen for incoming messages
    const msgChannel = supabase
      .channel("incoming-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          // Get sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", msg.sender_id)
            .single();

          toast.info(`New message from ${sender?.username || "someone"}`, {
            duration: 5000,
            icon: <MessageCircle className="h-5 w-5 text-primary" />,
            action: {
              label: "Reply",
              onClick: () => window.location.assign("/messages"),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);

  return null;
};
