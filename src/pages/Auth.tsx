import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import orbitLogo from '@/assets/orbit-logo.png';

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

  const hasPendingQuestion = !!sessionStorage.getItem('pendingQuestion');

  useEffect(() => {
    if (user) {
      if (hasPendingQuestion) {
        navigate('/ask');
      } else {
        navigate('/');
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
        title: 'Welcome!',
        description: 'Your account is ready.',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-base-100" data-theme="orbit">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={orbitLogo} alt="Orbit" className="h-16 w-auto" />
          </div>

          {/* Header */}
          <div className="text-center space-y-3">
            {hasPendingQuestion ? (
              <>
                <p className="text-sm text-primary font-medium">Almost there</p>
                <h1 className="text-2xl font-semibold tracking-tight text-base-content">
                  Create your account
                </h1>
                <p className="text-base-content/60 text-sm">
                  Get help with your question and track progress
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-base-content">
                  {isLogin ? 'Welcome back' : 'Get started'}
                </h1>
                <p className="text-base-content/60 text-sm">
                  {isLogin 
                    ? 'Sign in to continue'
                    : 'Create an account to get started'}
                </p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 bg-base-200 h-12 rounded-xl px-4 focus-within:ring-2 focus-within:ring-primary">
                <Mail className="h-4 w-4 text-base-content/40" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-base-content placeholder:text-base-content/40 focus:outline-none"
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-error px-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3 bg-base-200 h-12 rounded-xl px-4 focus-within:ring-2 focus-within:ring-primary">
                <Lock className="h-4 w-4 text-base-content/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-base-content placeholder:text-base-content/40 focus:outline-none"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-base-content/40 hover:text-base-content transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-error px-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-outline btn-primary w-full h-12 rounded-full font-medium hover:shadow-[0_0_16px_rgba(0,250,215,0.25)] transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  {isLogin ? 'Sign in' : 'Continue'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-base-content/60 hover:text-base-content transition-colors"
            >
              {isLogin 
                ? "Don't have an account? "
                : 'Already have an account? '}
              <span className="text-primary">{isLogin ? 'Sign up' : 'Sign in'}</span>
            </button>
          </div>

          {/* Benefits */}
          {!isLogin && (
            <div className="space-y-3 pt-4 border-t border-base-300">
              <div className="grid gap-3">
                {[
                  { title: 'Instant help', desc: 'Get step-by-step guidance' },
                  { title: 'Track progress', desc: 'See your improvement over time' },
                  { title: 'Save sessions', desc: 'Review past questions anytime' },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm font-medium text-base-content">{benefit.title}</p>
                      <p className="text-xs text-base-content/60">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-base-content/60 hover:text-base-content transition-colors"
        >
          ← Back to home
        </button>
      </footer>
    </div>
  );
}
