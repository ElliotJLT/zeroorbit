import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Target, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col math-pattern">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 mx-auto">
              <span className="text-4xl font-bold text-gradient">∑</span>
            </div>
            <h1 className="text-h1 text-3xl">Vector Tutor</h1>
            <p className="text-xl text-muted-foreground">
              Get unstuck on A-level Maths in minutes.
            </p>
          </div>

          {/* Features */}
          <div className="grid gap-4 text-left">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-2 border border-border">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">AI-powered tutoring</p>
                <p className="text-sm text-muted-foreground">
                  Get step-by-step help on any question
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-2 border border-border">
              <div className="p-2 rounded-lg bg-secondary/20">
                <MessageCircle className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-medium">Photo questions</p>
                <p className="text-sm text-muted-foreground">
                  Snap a photo, get instant help
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-2 border border-border">
              <div className="p-2 rounded-lg bg-warning/20">
                <Target className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Track progress</p>
                <p className="text-sm text-muted-foreground">
                  See which topics need more practice
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4 pt-4">
            <Button
              variant="hero"
              size="pill-xl"
              className="w-full"
              asChild
            >
              <Link to="/auth">
                Get started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free for A-level students
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground">
        <p>Built by Zero Gravity</p>
      </footer>
    </div>
  );
}
