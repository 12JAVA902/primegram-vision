import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Send, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export const GroupChat = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").neq("id", user?.id || "");
      return (data || []) as Profile[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroups = async () => {
    if (!user) return;
    // Fetch groups where user is creator OR member
    const { data: memberData } = await supabase.from("chat_group_members").select("group_id").eq("user_id", user.id);
    const memberGroupIds = (memberData || []).map((d: any) => d.group_id);

    // Also fetch groups created by user (in case membership insert hasn't propagated)
    const { data: createdGroups } = await supabase.from("chat_groups").select("*").eq("created_by", user.id);
    const createdGroupIds = (createdGroups || []).map((g: any) => g.id);

    const allIds = [...new Set([...memberGroupIds, ...createdGroupIds])];
    if (allIds.length === 0) { setGroups([]); return; }

    const { data: groupsData } = await supabase.from("chat_groups").select("*").in("id", allIds);
    setGroups((groupsData as Group[]) || []);
  };

  const fetchMessages = async (groupId: string) => {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true });
    setMessages((data as GroupMessage[]) || []);
  };

  useEffect(() => {
    if (!selectedGroup) return;
    fetchMessages(selectedGroup);
    const channel = supabase
      .channel("group-" + selectedGroup)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${selectedGroup}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as GroupMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup]);

  const createGroup = async () => {
    if (!groupName.trim() || !user || creating) return;
    setCreating(true);
    try {
      // Step 1: Create the group
      const { data, error } = await supabase.from("chat_groups").insert({ name: groupName.trim(), created_by: user.id }).select().single();
      if (error) throw error;
      const group = data as Group;

      // Step 2: Add creator + selected members
      const members = [user.id, ...selectedMembers].map(uid => ({ group_id: group.id, user_id: uid }));
      const { error: memberError } = await supabase.from("chat_group_members").insert(members);
      if (memberError) console.error("Member insert error:", memberError);

      toast.success("Group created!");
      setShowCreate(false);
      setGroupName("");
      setSelectedMembers([]);
      // Small delay to allow RLS to see the new membership
      setTimeout(() => fetchGroups(), 500);
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedGroup || !user) return;
    await supabase.from("group_messages").insert({ group_id: selectedGroup, sender_id: user.id, content: messageText });
    setMessageText("");
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return "You";
    return profiles?.find(p => p.id === senderId)?.username || "Unknown";
  };

  if (selectedGroup) {
    const group = groups.find(g => g.id === selectedGroup);
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold truncate">{group?.name}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {msg.sender_id !== user?.id && <p className="text-[10px] font-semibold text-accent mb-0.5">{getSenderName(msg.sender_id)}</p>}
                <p className="text-sm">{msg.content}</p>
                <p className="text-[10px] opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t border-border shrink-0 flex gap-2">
          <Input value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="flex-1" />
          <Button onClick={sendMessage} size="icon"><Send className="h-5 w-5" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h3 className="font-semibold">Group Chats</h3>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No groups yet. Create one!</p>}
        {groups.map(group => (
          <div key={group.id} onClick={() => setSelectedGroup(group.id)} className="p-4 cursor-pointer hover:bg-accent/10 transition-colors flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div><p className="font-medium text-sm">{group.name}</p><p className="text-xs text-muted-foreground">{group.description || "Tap to chat"}</p></div>
          </div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name" />
            <p className="text-sm font-medium">Add Members</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {profiles?.map(profile => (
                <div key={profile.id} onClick={() => toggleMember(profile.id)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/10">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{profile.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1">{profile.username}</span>
                  {selectedMembers.includes(profile.id) && <Check className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={createGroup} disabled={!groupName.trim() || creating}>
              {creating ? <span className="animate-spin">⏳</span> : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
