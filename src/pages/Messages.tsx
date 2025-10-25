import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Send, X, Mic, MicOff, VideoOff as VideoOffIcon, ArrowLeft } from "lucide-react";
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

interface CallSession {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'audio' | 'video';
  status: string;
  signal_data: any;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !selectedChat) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedChat}),and(sender_id.eq.${selectedChat},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${selectedChat}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedChat]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('call_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
        },
        async (payload) => {
          const session = payload.new as CallSession;
          
          if (session.receiver_id === user.id && session.status === 'ringing') {
            const accept = window.confirm(`Incoming ${session.call_type} call`);
            if (accept) {
              await handleAnswerCall(session);
            } else {
              await supabase
                .from('call_sessions')
                .update({ status: 'rejected' })
                .eq('id', session.id);
            }
          } else if (session.status === 'active' && session.signal_data?.answer && peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(session.signal_data.answer));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, peerConnection]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !user) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedChat,
      content: messageText,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender_id: user.id,
        receiver_id: selectedChat,
        content: messageText,
        created_at: new Date().toISOString(),
        read_at: null,
      },
    ]);
    setMessageText("");
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedChat || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && activeCall) {
          const currentData = activeCall.signal_data || {};
          await supabase
            .from('call_sessions')
            .update({
              signal_data: {
                ...currentData,
                candidates: [...(currentData.candidates || []), event.candidate],
              },
            })
            .eq('id', activeCall.id);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const { data, error } = await supabase
        .from('call_sessions')
        .insert([{
          caller_id: user.id,
          receiver_id: selectedChat,
          call_type: type,
          signal_data: { offer } as any,
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveCall(data as CallSession);
      setPeerConnection(pc);

      toast({
        title: "Calling...",
        description: `Starting ${type} call`,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive",
      });
    }
  };

  const handleAnswerCall = async (session: CallSession) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: session.call_type === 'video',
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(session.signal_data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase
        .from('call_sessions')
        .update({
          status: 'active',
          signal_data: { ...session.signal_data, answer },
        })
        .eq('id', session.id);

      setActiveCall(session);
      setPeerConnection(pc);
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const endCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (activeCall) {
      await supabase
        .from('call_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activeCall.id);
    }
    setActiveCall(null);
    setRemoteStream(null);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const selectedProfile = profiles?.find((p) => p.id === selectedChat);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
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
                className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                  selectedChat === profile.id ? 'bg-accent' : ''
                }`}
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
                  <Button variant="ghost" size="icon" onClick={() => startCall('audio')}>
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startCall('video')}>
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {activeCall && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            {activeCall.call_type === 'video' && (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 w-48 h-36 object-cover rounded-lg"
                />
              </>
            )}
            {activeCall.call_type === 'audio' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <Avatar className="w-32 h-32 mx-auto mb-4">
                    <AvatarImage src={selectedProfile?.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl">
                      {selectedProfile?.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-2xl font-semibold">{selectedProfile?.full_name || selectedProfile?.username}</p>
                  <p className="text-muted-foreground">Audio Call</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 flex justify-center gap-4">
            <Button variant="secondary" size="icon" className="h-14 w-14 rounded-full" onClick={toggleMute}>
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            {activeCall.call_type === 'video' && (
              <Button variant="secondary" size="icon" className="h-14 w-14 rounded-full" onClick={toggleVideo}>
                {isVideoOff ? <VideoOffIcon className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            )}
            <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full" onClick={endCall}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
