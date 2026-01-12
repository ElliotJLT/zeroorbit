import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Image, Calendar, FlaskConical, Play, CheckCircle, XCircle, Loader2, Users, Shield, Trash2, TrendingUp, Sparkles, Clock, ThumbsUp, MessageCircle, Lightbulb, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChatBubble } from '@/components/ChatBubble';
import { ImageViewer } from '@/components/ImageViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

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

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'student';
  created_at: string;
  email: string;
  full_name: string | null;
}

interface InvitedUser {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  last_sign_in: string | null;
  confirmed: boolean;
}

interface BetaInsights {
  totalSessions: number;
  uniqueUsers: number;
  avgConfidence: number;
  avgMessagesPerSession: number;
  topTopics: { name: string; count: number }[];
  recentFeedback: { name: string; feedback: string; wouldUseAgain: string }[];
  inputMethodBreakdown: { method: string; count: number }[];
  aiInsights: string | null;
  loading: boolean;
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [insights, setInsights] = useState<BetaInsights>({
    totalSessions: 0,
    uniqueUsers: 0,
    avgConfidence: 0,
    avgMessagesPerSession: 0,
    topTopics: [],
    recentFeedback: [],
    inputMethodBreakdown: [],
    aiInsights: null,
    loading: true,
  });
  const [generatingAIInsights, setGeneratingAIInsights] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSessions();
      fetchEvalRuns();
      fetchTeamMembers();
      fetchInvitedUsers();
      fetchInsights();
    }
  }, [isAdmin]);

  const fetchInsights = async () => {
    try {
      // Get session stats
      const { data: sessionsData, count: totalSessions } = await supabase
        .from('sessions')
        .select('*, topic:topics(name)', { count: 'exact' });

      // Get unique users
      const uniqueUserIds = new Set(sessionsData?.map(s => s.user_id) || []);
      
      // Calculate avg confidence
      const confidences = sessionsData?.filter(s => s.confidence_after).map(s => s.confidence_after!) || [];
      const avgConfidence = confidences.length > 0 
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
        : 0;

      // Get message counts per session
      const { data: messageStats } = await supabase
        .from('messages')
        .select('session_id');
      
      const sessionMessageCounts = new Map<string, number>();
      messageStats?.forEach(m => {
        sessionMessageCounts.set(m.session_id, (sessionMessageCounts.get(m.session_id) || 0) + 1);
      });
      const avgMessages = sessionMessageCounts.size > 0
        ? Array.from(sessionMessageCounts.values()).reduce((a, b) => a + b, 0) / sessionMessageCounts.size
        : 0;

      // Get top topics
      const topicCounts = new Map<string, number>();
      sessionsData?.forEach(s => {
        const topicName = s.topic?.name || 'Unknown';
        topicCounts.set(topicName, (topicCounts.get(topicName) || 0) + 1);
      });
      const topTopics = Array.from(topicCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get input method breakdown
      const inputMethodCounts = new Map<string, number>();
      sessionsData?.forEach(s => {
        const method = s.first_input_method || 'unknown';
        inputMethodCounts.set(method, (inputMethodCounts.get(method) || 0) + 1);
      });
      const inputMethodBreakdown = Array.from(inputMethodCounts.entries())
        .map(([method, count]) => ({ method, count }));

      // Get recent feedback
      const recentFeedback = sessionsData
        ?.filter(s => s.beta_feedback)
        .slice(0, 5)
        .map(s => ({
          name: s.beta_tester_name || 'Anonymous',
          feedback: s.beta_feedback || '',
          wouldUseAgain: s.would_use_again || 'unknown',
        })) || [];

      setInsights({
        totalSessions: totalSessions || 0,
        uniqueUsers: uniqueUserIds.size,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        avgMessagesPerSession: Math.round(avgMessages * 10) / 10,
        topTopics,
        recentFeedback,
        inputMethodBreakdown,
        aiInsights: null,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights(prev => ({ ...prev, loading: false }));
    }
  };

  const generateAIInsights = async () => {
    setGeneratingAIInsights(true);
    try {
      // Prepare context for AI
      const context = {
        totalSessions: insights.totalSessions,
        uniqueUsers: insights.uniqueUsers,
        avgConfidence: insights.avgConfidence,
        avgMessagesPerSession: insights.avgMessagesPerSession,
        topTopics: insights.topTopics,
        inputMethodBreakdown: insights.inputMethodBreakdown,
        recentFeedback: insights.recentFeedback,
      };

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [{
            role: 'user',
            content: `You are a product analyst for Orbit, an AI maths tutoring app in beta. Analyze this usage data and provide 3-5 actionable insights for the product team. Focus on what's working, what needs improvement, and specific recommendations.

Data:
- Total sessions: ${context.totalSessions}
- Unique users: ${context.uniqueUsers}
- Avg confidence rating: ${context.avgConfidence}/5
- Avg messages per session: ${context.avgMessagesPerSession}
- Top topics: ${context.topTopics.map(t => `${t.name} (${t.count})`).join(', ')}
- Input methods: ${context.inputMethodBreakdown.map(m => `${m.method}: ${m.count}`).join(', ')}
- Recent feedback samples: ${context.recentFeedback.map(f => `"${f.feedback}" (would use again: ${f.wouldUseAgain})`).join('; ')}

Provide concise, actionable insights in bullet points.`
          }],
          mode: 'check', // Use check mode for direct response
        }
      });

      if (response.data?.message) {
        setInsights(prev => ({ ...prev, aiInsights: response.data.message }));
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setGeneratingAIInsights(false);
    }
  };

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

  const fetchTeamMembers = async () => {
    try {
      // Use edge function to get admins with emails
      const { data, error } = await supabase.functions.invoke('manage-admins', {
        body: { action: 'list' }
      });

      if (error) throw error;

      if (data?.admins) {
        // Also fetch profiles for names
        const userIds = data.admins.map((a: { user_id: string }) => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const members: TeamMember[] = data.admins.map((admin: { id: string; user_id: string; email: string; created_at: string }) => ({
          id: admin.id,
          user_id: admin.user_id,
          role: 'admin' as const,
          created_at: admin.created_at || '',
          email: admin.email,
          full_name: profileMap.get(admin.user_id)?.full_name || null
        }));

        setTeamMembers(members);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
    }
  };

  const fetchInvitedUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { action: 'list' }
      });

      if (error) throw error;

      if (data?.users) {
        setInvitedUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const sendInvite = async () => {
    if (!newInviteEmail.trim()) return;
    
    setSendingInvite(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { action: 'invite', email: newInviteEmail.trim().toLowerCase() }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(`Invitation sent to ${newInviteEmail}`);
        setNewInviteEmail('');
        fetchInvitedUsers();
      } else {
        toast.error(data.message || 'Failed to send invitation');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    
    setAddingAdmin(true);
    
    try {
      // We need to add an edge function for this since we can't query auth.users
      const { data, error } = await supabase.functions.invoke('manage-admins', {
        body: { action: 'add', email: newAdminEmail.trim() }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(`Admin role granted to ${newAdminEmail}`);
        setNewAdminEmail('');
        fetchTeamMembers();
      } else {
        toast.error(data.message || 'Failed to add admin');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("You can't remove yourself");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
      
      toast.success('Admin removed');
      fetchTeamMembers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove admin');
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h2">Admin Dashboard</h1>
        </div>
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="evals">
            <FlaskConical className="h-4 w-4 mr-2" />
            LLM Evals
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="m-0 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {insights.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{insights.totalSessions}</p>
                          <p className="text-sm text-muted-foreground">Total Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{insights.uniqueUsers}</p>
                          <p className="text-sm text-muted-foreground">Unique Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <ThumbsUp className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{insights.avgConfidence}/5</p>
                          <p className="text-sm text-muted-foreground">Avg Confidence</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{insights.avgMessagesPerSession}</p>
                          <p className="text-sm text-muted-foreground">Msgs/Session</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Insights */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          AI Insights
                        </CardTitle>
                        <CardDescription>AI-generated analysis of beta usage patterns</CardDescription>
                      </div>
                      <Button 
                        onClick={generateAIInsights} 
                        disabled={generatingAIInsights}
                        size="sm"
                      >
                        {generatingAIInsights ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="h-4 w-4 mr-2" />
                            Generate Insights
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {insights.aiInsights ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-sm">{insights.aiInsights}</div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Click "Generate Insights" to get AI-powered analysis of your beta usage data.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Top Topics */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Top Topics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.topTopics.length > 0 ? (
                        insights.topTopics.map((topic, i) => (
                          <div key={topic.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="truncate">{topic.name}</span>
                              <span className="text-muted-foreground">{topic.count} sessions</span>
                            </div>
                            <Progress 
                              value={(topic.count / insights.totalSessions) * 100} 
                              className="h-2" 
                            />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No topic data yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Input Methods */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Input Methods</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.inputMethodBreakdown.length > 0 ? (
                        insights.inputMethodBreakdown.map((method) => (
                          <div key={method.method} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <span className="capitalize font-medium">{method.method}</span>
                            <span className="text-muted-foreground">{method.count} ({Math.round((method.count / insights.totalSessions) * 100)}%)</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Feedback */}
                {insights.recentFeedback.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recent Feedback</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.recentFeedback.map((f, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{f.name}</span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              f.wouldUseAgain === 'yes' && "bg-green-500/20 text-green-600",
                              f.wouldUseAgain === 'no' && "bg-red-500/20 text-red-600",
                              f.wouldUseAgain === 'maybe' && "bg-amber-500/20 text-amber-600",
                            )}>
                              {f.wouldUseAgain === 'yes' ? 'Would use again' : f.wouldUseAgain === 'no' ? 'Would not use again' : 'Maybe'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{f.feedback}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

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

        <TabsContent value="team" className="m-0">
          <div className="p-4 max-w-3xl mx-auto space-y-6">
            {/* Invite Beta Testers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Invite Beta Tester
                </CardTitle>
                <CardDescription>
                  Send a sign-up link via email. New users will receive an Orbit beta invitation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
                  />
                  <Button onClick={sendInvite} disabled={sendingInvite || !newInviteEmail.trim()}>
                    {sendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* All Users List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users ({invitedUsers.length})
                </CardTitle>
                <CardDescription>
                  All registered users in the Orbit beta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitedUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No users found</p>
                ) : (
                  <div className="space-y-2">
                    {invitedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface-1"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {u.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {u.full_name || 'No name set'} • {u.last_sign_in ? `Last seen ${formatDate(u.last_sign_in)}` : 'Never signed in'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {!u.confirmed && (
                            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">
                              Pending
                            </span>
                          )}
                          {u.is_admin && (
                            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Access
                </CardTitle>
                <CardDescription>
                  Grant or revoke admin privileges to existing users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Email address of existing user"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addAdmin()}
                  />
                  <Button onClick={addAdmin} disabled={addingAdmin || !newAdminEmail.trim()}>
                    {addingAdmin ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Grant Admin'
                    )}
                  </Button>
                </div>
                
                {teamMembers.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground">Current Admins</p>
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface-1"
                      >
                        <div>
                          <p className="font-medium">{member.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.full_name || 'No name set'}
                          </p>
                        </div>
                        {member.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeAdmin(member.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
