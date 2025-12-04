import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from '@/components/ChatBubble';
import { ImageViewer } from '@/components/ImageViewer';
import { ConfidenceRating } from '@/components/ConfidenceRating';
import { useToast } from '@/hooks/use-toast';
import orbitLogo from '@/assets/orbit-logo.png';

interface Session {
  id: string;
  question_text: string;
  question_image_url: string | null;
  working_image_url: string | null;
  confidence_after: number | null;
  topic_id: string | null;
}

interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  created_at: string;
}

function generateTutorReply(messages: Message[], questionText: string): string {
  const responses = [
    "Great question! Let me help you work through this step by step.\n\n1. First, identify what the question is asking\n2. Look for key information and formulas\n3. Apply the appropriate method\n4. Check your answer makes sense\n\nWhat part would you like to start with?",
    "I can see you're making progress! Here's a hint: try breaking it down into smaller parts. What's the first thing you notice about the question?",
    "That's a good approach! Let me guide you through the next step. Consider what happens when you apply the technique we discussed.",
    "You're on the right track. Remember the key formula here and think about how each term relates to what you're trying to find.",
    "Excellent progress! Now let's verify your answer by checking it makes sense in the context of the original question.",
  ];
  
  return responses[Math.min(messages.filter(m => m.sender === 'student').length, responses.length - 1)];
}

function generateInitialResponse(questionText: string, hasImage: boolean): string {
  return `Hey! I can see your question${hasImage ? ' and the image you uploaded' : ''}.

**Let me break this down for you:**

This looks like a great A-level question! Here's how we'll tackle it:

1. **Understand** what the question is asking
2. **Identify** the key concepts and formulas
3. **Work through** the solution step-by-step
4. **Check** our answer makes sense

What specific part would you like help with first? Or shall I start from the beginning?`;
}

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confidenceSubmitted, setConfidenceSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (sessionId && user) {
      fetchSession();
    }
  }, [sessionId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSession = async () => {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      toast({
        variant: 'destructive',
        title: 'Session not found',
        description: 'This session may have been deleted.',
      });
      navigate('/home');
      return;
    }

    setSession(sessionData);
    setConfidenceSubmitted(sessionData.confidence_after !== null);

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData);
    } else {
      const initialResponse = generateInitialResponse(
        sessionData.question_text,
        !!sessionData.question_image_url
      );

      const { data: newMessage } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender: 'tutor',
          content: initialResponse,
        })
        .select()
        .single();

      if (newMessage) {
        setMessages([newMessage]);
      }
    }

    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId) return;

    setSending(true);
    const messageContent = newMessage;
    setNewMessage('');

    const { data: studentMessage, error: studentError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        sender: 'student',
        content: messageContent,
      })
      .select()
      .single();

    if (studentError) {
      toast({
        variant: 'destructive',
        title: 'Error sending message',
        description: studentError.message,
      });
      setSending(false);
      return;
    }

    setMessages((prev) => [...prev, studentMessage]);

    const tutorResponse = generateTutorReply(
      [...messages, studentMessage],
      session?.question_text || ''
    );

    const { data: tutorMessage, error: tutorError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        sender: 'tutor',
        content: tutorResponse,
      })
      .select()
      .single();

    if (!tutorError && tutorMessage) {
      setMessages((prev) => [...prev, tutorMessage]);
    }

    setSending(false);
  };

  const handleConfidenceChange = async (value: number) => {
    if (!session || !user) return;

    await supabase
      .from('sessions')
      .update({ confidence_after: value })
      .eq('id', session.id);

    if (session.topic_id) {
      const { data: existingStat } = await supabase
        .from('practice_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', session.topic_id)
        .maybeSingle();

      if (existingStat) {
        await supabase
          .from('practice_stats')
          .update({
            attempts: existingStat.attempts + 1,
            correct_attempts: value >= 4 
              ? existingStat.correct_attempts + 1 
              : existingStat.correct_attempts,
          })
          .eq('id', existingStat.id);
      } else {
        await supabase
          .from('practice_stats')
          .insert({
            user_id: user.id,
            topic_id: session.topic_id,
            attempts: 1,
            correct_attempts: value >= 4 ? 1 : 0,
          });
      }
    }

    setConfidenceSubmitted(true);
    toast({
      title: 'Progress saved!',
      description: 'Keep up the amazing work.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={orbitLogo} alt="Orbit" className="h-6 w-auto" />
            <span className="font-medium text-muted-foreground">Chat</span>
          </div>
        </div>
      </div>

      {/* Question Preview */}
      {(session?.question_image_url || session?.working_image_url) && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {session?.question_image_url && (
                <ImageViewer
                  src={session.question_image_url}
                  alt="Question"
                  className="w-20 h-20 flex-shrink-0"
                />
              )}
              {session?.working_image_url && (
                <ImageViewer
                  src={session.working_image_url}
                  alt="Working"
                  className="w-20 h-20 flex-shrink-0"
                />
              )}
            </div>
            {session?.question_text && session.question_text !== 'See attached image' && (
              <p className="text-sm text-muted-foreground mt-2">
                {session.question_text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              sender={message.sender}
              content={message.content}
              timestamp={new Date(message.created_at)}
            />
          ))}
          <div ref={messagesEndRef} />

          {/* Confidence Rating */}
          {messages.length > 2 && !confidenceSubmitted && (
            <div className="bg-muted rounded-2xl p-4 mt-6 animate-fade-in border border-border">
              <ConfidenceRating
                value={null}
                onChange={handleConfidenceChange}
              />
            </div>
          )}

          {confidenceSubmitted && (
            <div className="text-center text-sm text-primary animate-fade-in">
              ✓ Progress saved
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={sending}
            className="rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="rounded-2xl px-6"
            style={{ 
              background: '#00FAD7',
              color: '#0B0D0F',
            }}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}