import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Send, X, Mic, MicOff, VideoOff as VideoOffIcon, ArrowLeft, Palette, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { GroupChat } from "@/components/GroupChat";
import { IncomingCallOverlay } from "@/components/IncomingCallOverlay";

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

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const CallOverlay = ({
  user, remoteUserId, callType, selectedProfile, isCaller, onEnd,
}: {
  user: { id: string }; remoteUserId: string; callType: "audio" | "video";
  selectedProfile: Profile | undefined; isCaller: boolean; onEnd: () => void;
}) => {
  const { localVideoRef, remoteVideoRef, isConnected, isMuted, isVideoOff, callDuration, startCall, answerCall, hangup, toggleMute, toggleVideo } = useWebRTC({
    userId: user.id, remoteUserId, callType, onCallEnded: onEnd,
  });

  useEffect(() => {
    if (isCaller) startCall(); else answerCall();
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {callType === "video" && <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />}
      {callType === "video" && <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-28 h-40 rounded-xl object-cover border-2 border-border z-10" />}
      {(callType === "audio" || !isConnected) && (
        <div className="flex-1 flex items-center justify-center z-10">
          <div className="text-center text-white">
            <Avatar className="w-32 h-32 mx-auto mb-4">
              <AvatarImage src={selectedProfile?.avatar_url || undefined} />
              <AvatarFallback className="text-4xl">{selectedProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-2xl font-semibold">{selectedProfile?.full_name || selectedProfile?.username}</p>
            <p className="text-muted-foreground capitalize">{callType} Call</p>
            {isConnected ? (
              <p className="text-sm text-green-400 mt-2">{formatDuration(callDuration)}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2 animate-pulse">{isCaller ? "Calling..." : "Connecting..."}</p>
            )}
          </div>
        </div>
      )}
      {callType === "video" && isConnected && (
        <div className="absolute top-4 left-4 z-10 bg-black/50 rounded-full px-3 py-1">
          <p className="text-white text-sm font-mono">{formatDuration(callDuration)}</p>
        </div>
      )}
      <div className="p-8 flex justify-center gap-4 z-10">
        <Button variant="secondary" size="icon" className="h-14 w-14 rounded-full" onClick={toggleMute}>
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        {callType === "video" && (
          <Button variant="secondary" size="icon" className="h-14 w-14 rounded-full" onClick={toggleVideo}>
            {isVideoOff ? <VideoOffIcon className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}
        <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full" onClick={hangup}>
          <X className="h-6 w-6" />
        </Button>
      </div>
      {callType === "audio" && (
        <>
          <audio ref={localVideoRef as any} autoPlay muted className="hidden" />
          <audio ref={remoteVideoRef as any} autoPlay className="hidden" />
        </>
      )}
    </div>
  );
};

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
  const [activeCall, setActiveCall] = useState<{ type: "audio" | "video"; isCaller: boolean } | null>(null);
  const [chatBg, setChatBg] = useState("");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; type: string } | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url, full_name").neq("id", user?.id || "");
      return (data || []) as Profile[];
    },
    enabled: !!user,
  });

  // Fetch last messages for contact list
  useEffect(() => {
    if (!user || !profiles?.length) return;
    const fetchLastMessages = async () => {
      const map: Record<string, Message> = {};
      for (const p of profiles) {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${p.id}),and(sender_id.eq.${p.id},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) map[p.id] = data[0] as Message;
      }
      setLastMessages(map);
    };
    fetchLastMessages();
  }, [user, profiles]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("call-incoming-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const session = payload.new as any;
        if (session.status === "ringing") {
          setIncomingCall({ callerId: session.caller_id, type: session.call_type });
          setTimeout(() => setIncomingCall(null), 30000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
        .from("messages").select("*")
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
    setIsRecording(true); setRecordingTime(0);
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
    setActiveCall({ type, isCaller: true });
    await supabase.from("call_sessions").insert({ caller_id: user.id, receiver_id: selectedChat, call_type: type, status: "ringing" });
  };

  const answerCall = () => {
    if (!incomingCall) return;
    setActiveCall({ type: incomingCall.type as "audio" | "video", isCaller: false });
    setSelectedChat(incomingCall.callerId);
    setIncomingCall(null);
  };

  const declineCall = () => setIncomingCall(null);

  const selectedProfile = profiles?.find((p) => p.id === selectedChat);
  const incomingCallerProfile = profiles?.find((p) => p.id === incomingCall?.callerId);

  // Full-screen chat view
  if (selectedChat) {
    return (
      <div className="h-screen flex flex-col relative z-10">
        <div className="p-3 border-b border-border glass-light flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to={`/profile/${selectedChat}`} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedProfile?.avatar_url || undefined} />
                <AvatarFallback>{selectedProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedProfile?.full_name || selectedProfile?.username}</p>
                <p className="text-xs text-muted-foreground">@{selectedProfile?.username}</p>
              </div>
            </Link>
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

        {showBgPicker && (
          <div className="p-3 border-b border-border glass-light flex gap-2 overflow-x-auto shrink-0">
            {CHAT_BACKGROUNDS.map((bg) => (
              <button key={bg.name} onClick={() => { setChatBg(bg.value); setShowBgPicker(false); }}
                className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 ${chatBg === bg.value ? "border-primary" : "border-border"}`}
                style={{ background: bg.value || "hsl(var(--background))" }} title={bg.name} />
            ))}
          </div>
        )}

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

        <div className="p-3 border-t border-border glass-light shrink-0">
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
              <Button variant="ghost" size="icon" onClick={startRecording}><Mic className="h-5 w-5" /></Button>
              <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="flex-1" />
              <Button onClick={sendMessage} size="icon"><Send className="h-5 w-5" /></Button>
            </div>
          )}
        </div>

        {activeCall && user && selectedChat && (
          <CallOverlay user={user} remoteUserId={selectedChat} callType={activeCall.type}
            selectedProfile={selectedProfile} isCaller={activeCall.isCaller} onEnd={() => setActiveCall(null)} />
        )}
        {incomingCall && (
          <IncomingCallOverlay callerName={incomingCallerProfile?.full_name || incomingCallerProfile?.username || "Unknown"}
            callerAvatar={incomingCallerProfile?.avatar_url} callType={incomingCall.type}
            onAccept={answerCall} onDecline={declineCall} />
        )}
      </div>
    );
  }

  if (showGroups) {
    return (
      <div className="h-screen flex flex-col relative z-10">
        <GroupChat onBack={() => setShowGroups(false)} />
      </div>
    );
  }

  // Sort profiles: those with messages first, by most recent
  const sortedProfiles = [...(profiles || [])].sort((a, b) => {
    const aMsg = lastMessages[a.id];
    const bMsg = lastMessages[b.id];
    if (aMsg && bMsg) return new Date(bMsg.created_at).getTime() - new Date(aMsg.created_at).getTime();
    if (aMsg) return -1;
    if (bMsg) return 1;
    return 0;
  });

  return (
    <div className="h-screen flex flex-col relative z-10">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-semibold">Messages</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowGroups(true)}>
          <Users className="h-4 w-4 mr-1" /> Groups
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedProfiles.map((profile) => {
          const last = lastMessages[profile.id];
          return (
            <div key={profile.id} onClick={() => setSelectedChat(profile.id)} className="p-4 cursor-pointer hover:bg-accent transition-colors flex items-center gap-3">
              <Link to={`/profile/${profile.id}`} onClick={(e) => e.stopPropagation()}>
                <Avatar>
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{profile.full_name || profile.username}</p>
                {last ? (
                  <p className="text-sm text-muted-foreground truncate">
                    {last.sender_id === user?.id ? "You: " : ""}{last.content}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                )}
              </div>
              {last && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {new Date(last.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>

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
              <Button className="h-16 w-16 rounded-full bg-[hsl(142_71%_45%)] hover:bg-[hsl(142_71%_38%)]" size="icon" onClick={answerCall}>
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
