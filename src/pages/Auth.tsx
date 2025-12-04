import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if there's a pending question from the landing page
  const hasPendingQuestion = !!sessionStorage.getItem('pendingQuestion');

  useEffect(() => {
    if (user) {
      // If there's a pending question, go to ask page
      if (hasPendingQuestion) {
        navigate('/ask');
      } else {
        navigate('/home');
      }
    }
  }, [user, navigate, hasPendingQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    
    const { error } = isLogin 
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: isLogin ? 'Sign in failed' : 'Sign up failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Incorrect email or password'
          : error.message.includes('already registered')
          ? 'This email is already registered. Try signing in instead.'
          : error.message,
      });
    } else if (!isLogin) {
      toast({
        title: 'Welcome to Vector Tutor! 🎉',
        description: 'Your account is ready.',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            {hasPendingQuestion ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Almost there!
                </div>
                <h1 className="text-3xl font-bold">
                  Create your free account
                </h1>
                <p className="text-muted-foreground">
                  To get help with your question and track your progress
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">
                  {isLogin ? 'Welcome back!' : 'Join Vector Tutor'}
                </h1>
                <p className="text-muted-foreground">
                  {isLogin 
                    ? 'Sign in to continue learning'
                    : 'Get unstuck on A-level Maths in minutes'}
                </p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 rounded-2xl"
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive pl-4">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 rounded-2xl"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive pl-4">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg rounded-2xl btn-primary"
              disabled={loading}
            >
              {loading ? (
                'Loading...'
              ) : (
                <>
                  {isLogin ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Benefits */}
          {!isLogin && (
            <div className="space-y-3 pt-4">
              <p className="text-sm text-center text-muted-foreground">What you get:</p>
              <div className="grid gap-2">
                {[
                  '🎯 Instant help on any maths question',
                  '📊 Track your progress by topic',
                  '💾 Save your sessions for revision',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass-card">
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Free for A-level students 🎓
        </p>
      </footer>
    </div>
  );
}
