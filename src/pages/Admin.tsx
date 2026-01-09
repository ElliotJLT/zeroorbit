import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Image, Calendar, FlaskConical, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatBubble } from '@/components/ChatBubble';
import { ImageViewer } from '@/components/ImageViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface EvalResult {
  id: string;
  run_id: string;
  test_name: string;
  test_setup: string;
  student_input: string;
  expected_behavior: string;
  red_flags: string[];
  orbit_response: string;
  passed: boolean;
  red_flags_found: string[] | null;
  failure_reason: string | null;
  created_at: string;
}

interface EvalRun {
  run_id: string;
  created_at: string;
  total: number;
  passed: number;
  failed: number;
  results: EvalResult[];
}

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionWithProfile[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null);
  const [runningEval, setRunningEval] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/home');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSessions();
      fetchEvalRuns();
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

  const fetchEvalRuns = async () => {
    // Fetch all eval results and group by run_id
    const { data, error } = await supabase
      .from('eval_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching eval results:', error);
      return;
    }

    if (data) {
      // Group by run_id
      const runsMap = new Map<string, EvalResult[]>();
      data.forEach((result: EvalResult) => {
        const existing = runsMap.get(result.run_id) || [];
        existing.push(result);
        runsMap.set(result.run_id, existing);
      });

      // Convert to array of runs
      const runs: EvalRun[] = Array.from(runsMap.entries()).map(([run_id, results]) => {
        const passed = results.filter(r => r.passed).length;
        return {
          run_id,
          created_at: results[0].created_at,
          total: results.length,
          passed,
          failed: results.length - passed,
          results: results.sort((a, b) => a.test_name.localeCompare(b.test_name))
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEvalRuns(runs);
      if (runs.length > 0 && !selectedRun) {
        setSelectedRun(runs[0]);
      }
    }
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

  const runEval = async (subset?: string) => {
    setRunningEval(true);
    toast.info('Starting eval run...', { duration: 3000 });

    try {
      const response = await supabase.functions.invoke('eval-chat', {
        body: subset ? { runSubset: subset } : {}
      });

      if (response.error) {
        toast.error(`Eval failed: ${response.error.message}`);
      } else {
        const data = response.data;
        toast.success(`Eval complete: ${data.passed}/${data.total} passed (${data.pass_rate})`);
        // Refresh eval runs
        await fetchEvalRuns();
      }
    } catch (error) {
      console.error('Eval error:', error);
      toast.error('Failed to run eval');
    } finally {
      setRunningEval(false);
    }
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h2">Admin Dashboard</h1>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="sessions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="evals">
            <FlaskConical className="h-4 w-4 mr-2" />
            LLM Evals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="m-0">
          <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
            {/* Sessions List */}
            <div className={cn(
              "lg:w-1/2 border-r border-border overflow-y-auto",
              selectedSession && "hidden lg:block"
            )}>
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
        </TabsContent>

        <TabsContent value="evals" className="m-0">
          <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)]">
            {/* Runs List */}
            <div className={cn(
              "lg:w-1/3 border-r border-border overflow-y-auto",
              selectedRun && "hidden lg:block"
            )}>
              <div className="p-4 border-b border-border">
                <Button 
                  onClick={() => runEval()} 
                  disabled={runningEval}
                  className="w-full"
                >
                  {runningEval ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Full Eval
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 space-y-2">
                {evalRuns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No eval runs yet. Click "Run Full Eval" to start.
                  </p>
                ) : (
                  evalRuns.map((run) => (
                    <Card
                      key={run.run_id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:border-primary",
                        selectedRun?.run_id === run.run_id && "border-primary bg-primary/5"
                      )}
                      onClick={() => setSelectedRun(run)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {formatDate(run.created_at)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {run.total} tests
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-lg font-bold",
                              run.passed === run.total ? "text-green-500" : 
                              run.passed > run.failed ? "text-yellow-500" : "text-red-500"
                            )}>
                              {Math.round((run.passed / run.total) * 100)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {run.passed}/{run.total} passed
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Run Details */}
            <div className={cn(
              "lg:w-2/3 flex flex-col overflow-y-auto",
              !selectedRun && "hidden lg:flex"
            )}>
              {selectedRun ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-4 lg:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedRun(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-medium">
                      Run from {formatDate(selectedRun.created_at)}
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{selectedRun.total}</p>
                        <p className="text-sm text-muted-foreground">Total Tests</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-500">{selectedRun.passed}</p>
                        <p className="text-sm text-muted-foreground">Passed</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-500">{selectedRun.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    {selectedRun.results.map((result) => (
                      <Card 
                        key={result.id}
                        className={cn(
                          "transition-all",
                          result.passed ? "border-green-500/30" : "border-red-500/30"
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                              )}
                              {result.test_name}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Setup</p>
                            <p className="text-sm bg-surface-1 p-2 rounded">{result.test_setup}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Student Input</p>
                            <p className="text-sm bg-surface-1 p-2 rounded">{result.student_input}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Orbit Response</p>
                            <p className="text-sm bg-surface-1 p-2 rounded whitespace-pre-wrap">{result.orbit_response}</p>
                          </div>
                          {!result.passed && result.failure_reason && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                              <p className="text-xs font-medium text-red-500 uppercase mb-1">Failure Reason</p>
                              <p className="text-sm text-red-400">{result.failure_reason}</p>
                            </div>
                          )}
                          {result.red_flags_found && result.red_flags_found.length > 0 && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3">
                              <p className="text-xs font-medium text-orange-500 uppercase mb-1">Red Flags Found</p>
                              <div className="flex flex-wrap gap-2">
                                {result.red_flags_found.map((flag, i) => (
                                  <span key={i} className="text-xs bg-orange-500/20 px-2 py-1 rounded">
                                    "{flag}"
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an eval run to view results</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
