import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Send, X, Mic, MicOff, VideoOff as VideoOffIcon, ArrowLeft, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

const CHAT_BACKGROUNDS = [
  { name: "Default", value: "" },
  { name: "Night", value: "linear-gradient(135deg, hsl(230 30% 12%), hsl(260 20% 18%))" },
  { name: "Ocean", value: "linear-gradient(135deg, hsl(200 60% 20%), hsl(180 40% 15%))" },
  { name: "Forest", value: "linear-gradient(135deg, hsl(140 30% 15%), hsl(160 25% 10%))" },
  { name: "Sunset", value: "linear-gradient(135deg, hsl(20 50% 20%), hsl(340 40% 18%))" },
  { name: "Purple", value: "linear-gradient(135deg, hsl(270 40% 18%), hsl(300 30% 15%))" },
];

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeCall, setActiveCall] = useState<{ type: "audio" | "video" } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatBg, setChatBg] = useState("");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").neq("id", user?.id);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("incoming-calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const call = payload.new as any;
        if (call.status === "ringing") {
          setIncomingCall({ callerId: call.caller_id, type: call.call_type });
          // Auto-dismiss after 30s
          setTimeout(() => setIncomingCall(null), 30000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Listen for incoming message notifications (global)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("msg-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id !== selectedChat) {
          const sender = profiles?.find(p => p.id === msg.sender_id);
          toast({ title: `New message from ${sender?.username || "someone"}`, description: msg.content.substring(0, 80) });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedChat, profiles]);

  useEffect(() => {
    if (!user || !selectedChat) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedChat}),and(sender_id.eq.${selectedChat},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    const channel = supabase
      .channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${selectedChat}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedChat]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !user) return;
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedChat, content: messageText });
    if (error) { toast({ title: "Error", description: "Failed to send message", variant: "destructive" }); return; }
    setMessages((prev) => [...prev, { id: Math.random().toString(), sender_id: user.id, receiver_id: selectedChat, content: messageText, created_at: new Date().toISOString(), read_at: null }]);
    await supabase.from("notifications").insert({ user_id: selectedChat, from_user_id: user.id, type: "message", title: "New message", body: messageText.substring(0, 100) });
    setMessageText("");
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    if (selectedChat && user) {
      const voiceMsg = `🎤 Voice message (${recordingTime}s)`;
      supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedChat, content: voiceMsg }).then(() => {
        setMessages((prev) => [...prev, { id: Math.random().toString(), sender_id: user.id, receiver_id: selectedChat!, content: voiceMsg, created_at: new Date().toISOString(), read_at: null }]);
      });
    }
    setRecordingTime(0);
  };

  const startCall = async (type: "audio" | "video") => {
    if (!selectedChat || !user) return;
    setActiveCall({ type });
    // Create call session in DB
    await supabase.from("call_sessions").insert({
      caller_id: user.id,
      receiver_id: selectedChat,
      call_type: type,
      status: "ringing",
    });
    toast({ title: "Calling...", description: `Starting ${type} call` });
  };

  const answerCall = () => {
    if (!incomingCall) return;
    setActiveCall({ type: incomingCall.type as "audio" | "video" });
    setSelectedChat(incomingCall.callerId);
    setIncomingCall(null);
  };

  const declineCall = () => setIncomingCall(null);

  const selectedProfile = profiles?.find((p) => p.id === selectedChat);
  const incomingCallerProfile = profiles?.find((p) => p.id === incomingCall?.callerId);

  // Full-screen chat view when a chat is selected
  if (selectedChat) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Chat header */}
        <div className="p-3 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src={selectedProfile?.avatar_url || undefined} />
              <AvatarFallback>{selectedProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{selectedProfile?.full_name || selectedProfile?.username}</p>
              <p className="text-xs text-muted-foreground">@{selectedProfile?.username}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBgPicker(!showBgPicker)}>
              <Palette className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startCall("audio")}>
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startCall("video")}>
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Background picker */}
        {showBgPicker && (
          <div className="p-3 border-b border-border bg-card flex gap-2 overflow-x-auto shrink-0">
            {CHAT_BACKGROUNDS.map((bg) => (
              <button
                key={bg.name}
                onClick={() => { setChatBg(bg.value); setShowBgPicker(false); }}
                className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 ${chatBg === bg.value ? "border-primary" : "border-border"}`}
                style={{ background: bg.value || "hsl(var(--background))" }}
                title={bg.name}
              />
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: chatBg || undefined }}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${message.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                <p className="text-sm">{message.content}</p>
                <p className="text-[10px] opacity-60 mt-1">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-card shrink-0">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-full px-4 py-2">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium">Recording... {recordingTime}s</span>
              </div>
              <Button onClick={stopRecording} size="icon" variant="destructive" className="rounded-full">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={startRecording}>
                <Mic className="h-5 w-5" />
              </Button>
              <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="flex-1" />
              <Button onClick={sendMessage} size="icon">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Call overlay */}
        {activeCall && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage src={selectedProfile?.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">{selectedProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="text-2xl font-semibold">{selectedProfile?.full_name || selectedProfile?.username}</p>
                <p className="text-muted-foreground capitalize">{activeCall.type} Call</p>
                <p className="text-sm text-muted-foreground mt-2">Calling...</p>
              </div>
            </div>
            <div className="p-8 flex justify-center gap-4">
              <Button variant="secondary" size="icon" className="h-14 w-14 rounded-full" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              {activeCall.type === "video" && (
                <Button variant="secondary" size="icon" className="h-14 w-14 rounded-full" onClick={() => setIsVideoOff(!isVideoOff)}>
                  {isVideoOff ? <VideoOffIcon className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              )}
              <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full" onClick={() => setActiveCall(null)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}

        {/* Incoming call overlay */}
        {incomingCall && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="text-center text-white">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={incomingCallerProfile?.avatar_url || undefined} />
                <AvatarFallback className="text-3xl">{incomingCallerProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-xl font-semibold">{incomingCallerProfile?.full_name || incomingCallerProfile?.username}</p>
              <p className="text-muted-foreground capitalize mb-6">Incoming {incomingCall.type} call</p>
              <div className="flex gap-6 justify-center">
                <Button variant="destructive" size="icon" className="h-16 w-16 rounded-full" onClick={declineCall}>
                  <X className="h-8 w-8" />
                </Button>
                <Button className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700" size="icon" onClick={answerCall}>
                  <Phone className="h-8 w-8" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Contacts list view
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-4 border-b border-border flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {profiles?.map((profile) => (
          <div key={profile.id} onClick={() => setSelectedChat(profile.id)} className="p-4 cursor-pointer hover:bg-accent transition-colors flex items-center gap-3">
            <Avatar>
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile.full_name || profile.username}</p>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Incoming call overlay on contacts list too */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="text-center text-white">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={incomingCallerProfile?.avatar_url || undefined} />
              <AvatarFallback className="text-3xl">{incomingCallerProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-xl font-semibold">{incomingCallerProfile?.full_name || incomingCallerProfile?.username}</p>
            <p className="text-muted-foreground capitalize mb-6">Incoming {incomingCall.type} call</p>
            <div className="flex gap-6 justify-center">
              <Button variant="destructive" size="icon" className="h-16 w-16 rounded-full" onClick={declineCall}>
                <X className="h-8 w-8" />
              </Button>
              <Button className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700" size="icon" onClick={answerCall}>
                <Phone className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
