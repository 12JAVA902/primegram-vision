import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Send, X, Mic, MicOff, VideoOff as VideoOffIcon, ArrowLeft, AudioLines } from "lucide-react";
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

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const [activeCall, setActiveCall] = useState<{ type: "audio" | "video" } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").neq("id", user?.id);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

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
    if (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      return;
    }
    setMessages((prev) => [...prev, { id: Math.random().toString(), sender_id: user.id, receiver_id: selectedChat, content: messageText, created_at: new Date().toISOString(), read_at: null }]);
    
    // Send notification
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
    // Simulated voice message
    if (selectedChat && user) {
      const voiceMsg = `🎤 Voice message (${recordingTime}s)`;
      supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedChat, content: voiceMsg }).then(() => {
        setMessages((prev) => [...prev, { id: Math.random().toString(), sender_id: user.id, receiver_id: selectedChat!, content: voiceMsg, created_at: new Date().toISOString(), read_at: null }]);
      });
    }
    setRecordingTime(0);
  };

  const startCall = (type: "audio" | "video") => {
    setActiveCall({ type });
    toast({ title: "Calling...", description: `Starting ${type} call` });
  };

  const selectedProfile = profiles?.find((p) => p.id === selectedChat);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>
          <div className="overflow-y-auto">
            {profiles?.map((profile) => (
              <div
                key={profile.id}
                onClick={() => setSelectedChat(profile.id)}
                className={`p-4 cursor-pointer hover:bg-accent transition-colors ${selectedChat === profile.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedProfile?.avatar_url || undefined} />
                    <AvatarFallback>{selectedProfile?.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedProfile?.full_name || selectedProfile?.username}</p>
                    <p className="text-sm text-muted-foreground">@{selectedProfile?.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => startCall("audio")}>
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startCall("video")}>
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${message.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-card">
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
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Call UI Overlay */}
      {activeCall && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <Avatar className="w-32 h-32 mx-auto mb-4">
                <AvatarImage src={selectedProfile?.avatar_url || undefined} />
                <AvatarFallback className="text-4xl">{selectedProfile?.username[0].toUpperCase()}</AvatarFallback>
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
    </div>
  );
};

export default Messages;
