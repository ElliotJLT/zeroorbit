import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Image, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatBubble } from '@/components/ChatBubble';
import { ImageViewer } from '@/components/ImageViewer';
import { cn } from '@/lib/utils';

interface SessionWithProfile {
  id: string;
  question_text: string;
  question_image_url: string | null;
  working_image_url: string | null;
  confidence_after: number | null;
  created_at: string;
  topic: { name: string } | null;
  profile: { full_name: string | null } | null;
}

interface Message {
  id: string;
  sender: 'student' | 'tutor';
  content: string;
  created_at: string;
}

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithProfile[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/home');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSessions();
    }
  }, [isAdmin]);

  const fetchSessions = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        topic:topics(name),
        profile:profiles!sessions_user_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setSessions(data as unknown as SessionWithProfile[]);
    }

    setLoading(false);
  };

  const fetchMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const handleSessionClick = (session: SessionWithProfile) => {
    setSelectedSession(session);
    fetchMessages(session.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Sessions List */}
        <div className={cn(
          "lg:w-1/2 border-r border-border overflow-y-auto",
          selectedSession && "hidden lg:block"
        )}>
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-h2">Admin Dashboard</h1>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:border-primary",
                  selectedSession?.id === session.id && "border-primary bg-primary/5"
                )}
                onClick={() => handleSessionClick(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {session.profile?.full_name || 'Unknown Student'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.question_text.slice(0, 60)}
                        {session.question_text.length > 60 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.created_at)}
                        </span>
                        {session.topic && (
                          <span className="px-2 py-0.5 rounded bg-surface-2">
                            {session.topic.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {session.question_image_url && (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      )}
                      {session.confidence_after && (
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary/20 text-secondary">
                          {session.confidence_after}/5
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Session Detail */}
        <div className={cn(
          "lg:w-1/2 flex flex-col",
          !selectedSession && "hidden lg:flex"
        )}>
          {selectedSession ? (
            <>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedSession(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <p className="font-medium">
                      {selectedSession.profile?.full_name || 'Unknown Student'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.topic?.name || 'No topic'} • {formatDate(selectedSession.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Images */}
              {(selectedSession.question_image_url || selectedSession.working_image_url) && (
                <div className="p-4 border-b border-border bg-surface-1">
                  <div className="flex gap-2">
                    {selectedSession.question_image_url && (
                      <ImageViewer
                        src={selectedSession.question_image_url}
                        alt="Question"
                        className="w-24 h-24"
                      />
                    )}
                    {selectedSession.working_image_url && (
                      <ImageViewer
                        src={selectedSession.working_image_url}
                        alt="Working"
                        className="w-24 h-24"
                      />
                    )}
                  </div>
                  <p className="text-sm mt-2">{selectedSession.question_text}</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      sender={message.sender}
                      content={message.content}
                      timestamp={new Date(message.created_at)}
                    />
                  ))}
                </div>
              </div>

              {/* Confidence */}
              {selectedSession.confidence_after && (
                <div className="border-t border-border p-4 bg-surface-1">
                  <p className="text-sm text-muted-foreground">
                    Student confidence: {' '}
                    <span className="text-secondary font-medium">
                      {selectedSession.confidence_after}/5
                    </span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a session to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
