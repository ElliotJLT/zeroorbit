import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import orbitLogo from '@/assets/orbit-logo.png';

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

  // Intro screen
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full space-y-12 animate-fade-in">
            {/* Logo with glow */}
            <div className="relative flex justify-center items-center mb-8">
              <div 
                className="absolute w-48 h-48 blur-2xl"
                style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.35) 0%, transparent 70%)' }}
              />
              <img 
                src={orbitLogo} 
                alt="Orbit" 
                className="relative h-36 w-auto"
              />
            </div>

            {/* Hero */}
            <div className="space-y-4">
              <h1 
                className="text-5xl tracking-tight leading-[1.05]"
                style={{ textShadow: '0 0 40px rgba(0,250,215,0.08)' }}
              >
                <span className="font-semibold">Turn stuck questions</span>
                <br />
                <span className="font-normal" style={{ color: 'rgba(255,255,255,0.8)' }}>into marks.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Snap your question.<br />
                Orbit walks you through the method — clearly and calmly.
              </p>
            </div>

            {/* Main CTA */}
            <div className="space-y-4">
              <Button
                onClick={() => setStep('upload')}
                className="w-full max-w-xs mx-auto h-14 text-base rounded-full font-medium transition-all text-white"
                style={{ 
                  background: '#111416',
                  border: '1px solid #00FAD7',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(0,250,215,0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <Camera className="h-5 w-5 mr-2" />
                Try It Free
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Built for AQA, Edexcel and OCR students
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border">
              <div className="text-center space-y-2">
                <div className="text-3xl font-semibold text-foreground">24/7</div>
                <p className="text-xs text-muted-foreground">Always-on tutoring</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-semibold text-foreground">Free</div>
                <p className="text-xs text-muted-foreground">No sign-up to try</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? <span className="text-primary">Sign in</span>
          </button>
        </footer>
      </div>
    );
  }

  // Upload screen
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setStep('intro')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">What do you need help with?</h2>
              <p className="text-muted-foreground">
                Upload a photo or describe your question
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
              className="upload-zone rounded-2xl p-10 flex flex-col items-center gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium text-foreground">Upload photo</p>
                <p className="text-sm text-muted-foreground">
                  Take a photo or choose from library
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Text input */}
            <Textarea
              placeholder="Type your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="min-h-[120px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
            />

            {questionText.trim() && (
              <Button
                onClick={handleGetHelp}
                className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 animate-fade-in"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Preview screen
  return (
    <div className="min-h-screen flex flex-col p-6 bg-background">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setStep('upload')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Review your question</h2>
            <p className="text-muted-foreground">
              Add details to get better help
            </p>
          </div>

          {/* Image preview */}
          <div className="relative">
            <img
              src={imagePreview!}
              alt="Question"
              className="w-full rounded-xl border border-border"
            />
            <button
              onClick={clearImage}
              className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-sm hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Optional text */}
          <Textarea
            placeholder="Add context or specify what you need help with (optional)"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="min-h-[100px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
          />

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleGetHelp}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90"
            >
              Get Help
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Free account required to continue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
