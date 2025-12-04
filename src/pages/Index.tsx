import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowRight, Sparkles, Zap, Send, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'upload' | 'preview'>('intro');
  const [questionText, setQuestionText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetHelp = () => {
    // Store the question in sessionStorage for after auth
    sessionStorage.setItem('pendingQuestion', JSON.stringify({
      text: questionText,
      image: imagePreview
    }));
    navigate('/auth');
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setStep('upload');
  };

  // Intro screen - value prop
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 animate-fade-in">
            {/* Hero */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI-powered maths help
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight">
                Stuck on{' '}
                <span className="text-gradient">A-level Maths</span>?
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Snap a photo. Get instant help. It's that simple.
              </p>
            </div>

            {/* Main CTA */}
            <div className="space-y-4 pt-4">
              <Button
                onClick={() => setStep('upload')}
                className="w-full h-16 text-lg rounded-2xl btn-primary"
              >
                <Camera className="h-6 w-6 mr-2" />
                Take a photo of your question
              </Button>
              
              <p className="text-sm text-muted-foreground">
                No signup required to try it out ✨
              </p>
            </div>

            {/* Social proof */}
            <div className="pt-8 space-y-4">
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-2xl">⭐</span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Loved by 1000+ A-level students
              </p>
            </div>

            {/* Quick features */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center p-4 rounded-xl glass-card">
                <div className="text-2xl mb-2">📸</div>
                <p className="text-xs text-muted-foreground">Photo to solution</p>
              </div>
              <div className="text-center p-4 rounded-xl glass-card">
                <div className="text-2xl mb-2">🎯</div>
                <p className="text-xs text-muted-foreground">Step-by-step help</p>
              </div>
              <div className="text-center p-4 rounded-xl glass-card">
                <div className="text-2xl mb-2">📈</div>
                <p className="text-xs text-muted-foreground">Track progress</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Already have an account? Sign in
          </button>
        </footer>
      </div>
    );
  }

  // Upload screen
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex flex-col p-6">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setStep('intro')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Instant help
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What's your question?</h2>
              <p className="text-muted-foreground">
                Take a photo or type it out
              </p>
            </div>

            {/* Photo upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageChange}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="upload-zone rounded-2xl p-8 flex flex-col items-center gap-4 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">Tap to take or upload a photo</p>
                <p className="text-sm text-muted-foreground">
                  Works best with clear, well-lit images
                </p>
              </div>
            </button>

            {/* Or divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or type it</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Text input */}
            <Textarea
              placeholder="Type or paste your maths question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="min-h-[100px] rounded-2xl"
            />

            {questionText.trim() && (
              <Button
                onClick={handleGetHelp}
                className="w-full h-14 text-lg rounded-2xl btn-primary animate-fade-in"
              >
                Get help
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Preview screen
  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setStep('upload')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Looking good! 📸</h2>
            <p className="text-muted-foreground">
              Add any extra details if needed
            </p>
          </div>

          {/* Image preview */}
          <div className="relative">
            <img
              src={imagePreview!}
              alt="Question"
              className="w-full rounded-2xl border border-border"
            />
            <button
              onClick={clearImage}
              className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Optional text */}
          <Textarea
            placeholder="Add any extra details about your question (optional)..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="min-h-[80px] rounded-2xl"
          />

          {/* CTA */}
          <div className="space-y-3">
            <Button
              onClick={handleGetHelp}
              className="w-full h-14 text-lg rounded-2xl btn-primary"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Get instant help
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Create a free account to save your progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
