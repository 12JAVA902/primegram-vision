-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create call_sessions table for WebRTC signaling
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'rejected')),
  signal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for call_sessions
CREATE POLICY "Users can view their own call sessions"
ON public.call_sessions
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call sessions"
ON public.call_sessions
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their call sessions"
ON public.call_sessions
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;