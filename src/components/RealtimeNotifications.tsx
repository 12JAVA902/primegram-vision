import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { IncomingCallOverlay } from "@/components/IncomingCallOverlay";
import { useNavigate } from "react-router-dom";

export const RealtimeNotifications = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    type: string;
    callerName: string;
    callerAvatar: string | null;
  } | null>(null);

  // We need to attempt navigation but can't use useNavigate outside Router
  // So we use window.location as fallback
  const navigateToMessages = () => {
    window.location.assign("/messages");
  };

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
        async (payload) => {
          const call = payload.new as any;
          if (call.status === "ringing") {
            // Fetch caller profile
            const { data: caller } = await supabase
              .from("profiles")
              .select("username, full_name, avatar_url")
              .eq("id", call.caller_id)
              .single();

            setIncomingCall({
              callerId: call.caller_id,
              type: call.call_type,
              callerName: caller?.full_name || caller?.username || "Unknown",
              callerAvatar: caller?.avatar_url || null,
            });

            // Auto-dismiss after 30s
            setTimeout(() => setIncomingCall(null), 30000);
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

  const handleAccept = () => {
    setIncomingCall(null);
    navigateToMessages();
  };

  const handleDecline = () => {
    setIncomingCall(null);
  };

  return (
    <>
      {incomingCall && (
        <IncomingCallOverlay
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.type}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </>
  );
};
