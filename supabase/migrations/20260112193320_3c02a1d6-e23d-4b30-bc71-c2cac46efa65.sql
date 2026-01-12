-- Create table to track message feedback (thumbs up/down, copy, listen)
CREATE TABLE public.message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'copy', 'listen')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (for guests too)
CREATE POLICY "Anyone can insert feedback"
ON public.message_feedback
FOR INSERT
WITH CHECK (true);

-- Allow admins to read all feedback
CREATE POLICY "Admins can view all feedback"
ON public.message_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Index for quick lookups
CREATE INDEX idx_message_feedback_session ON public.message_feedback(session_id);
CREATE INDEX idx_message_feedback_type ON public.message_feedback(feedback_type);