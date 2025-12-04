import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import orbitLogo from '@/assets/orbit-logo.png';
import orbitIcon from '@/assets/orbit-icon.png';

interface QuestionAnalysis {
  questionSummary: string;
  topic: string;
  difficulty: string;
  socraticOpening: string;
}

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'upload' | 'preview'>('intro');
  const [questionText, setQuestionText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QuestionAnalysis | null>(null);
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

  const analyzeAndSubmit = async () => {
    if (!imagePreview) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64: imagePreview,
          questionText: questionText 
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze question');
      }

      const analysisData = response.data as QuestionAnalysis;
      setAnalysis(analysisData);
      
      // Store everything for after auth
      sessionStorage.setItem('pendingQuestion', JSON.stringify({
        text: questionText || 'See attached image',
        image: imagePreview,
        analysis: analysisData
      }));
      
      navigate('/auth');
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis failed',
        description: 'Please try again.'
      });
      // Fallback - continue without analysis
      sessionStorage.setItem('pendingQuestion', JSON.stringify({
        text: questionText || 'See attached image',
        image: imagePreview
      }));
      navigate('/auth');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setAnalysis(null);
    setIsAnalyzing(false);
    setStep('upload');
  };

  // Intro screen
  if (step === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full space-y-12 animate-fade-in">
            {/* Logo with glow */}
            <div className="relative flex flex-col items-center mb-8">
              <div 
                className="absolute w-48 h-48 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.35) 0%, transparent 70%)' }}
              />
              <img 
                src={orbitLogo} 
                alt="Orbit" 
                className="relative h-44 w-auto"
              />
            </div>

            {/* Hero */}
            <div className="space-y-4">
              <h1 
                className="text-4xl tracking-tight leading-[1.15]"
                style={{ textShadow: '0 0 40px rgba(0,250,215,0.08)' }}
              >
                <span className="font-semibold">Stuck on a maths question?</span>
                <br />
                <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Show Orbit.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Get a step-by-step walkthrough made for AQA, Edexcel and OCR students.
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
        <footer className="p-6 text-center space-y-6">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? <span className="text-primary">Sign in</span>
          </button>
          <div className="pt-2">
            <img 
              src={orbitIcon} 
              alt="Zero Gravity" 
              className="h-10 w-auto mx-auto opacity-50"
            />
          </div>
        </footer>
      </div>
    );
  }

  // Camera screen
  if (step === 'upload') {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setStep('intro')}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-lg font-medium text-white">Snap your question</h2>
          <div className="w-12" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
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
            className="w-full max-w-sm aspect-[3/4] rounded-3xl border-2 border-white/20 bg-white/5 flex flex-col items-center justify-center gap-6 transition-all hover:border-primary/50 hover:bg-white/10"
          >
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,250,215,0.2)' }}
            >
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-medium">Tap to open camera</p>
              <p className="text-white/50 text-sm">Point at your maths question</p>
            </div>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                    setImageFile(file);
                    setStep('preview');
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="w-full text-center text-sm text-white/60 hover:text-white transition-colors py-2"
          >
            Upload from library instead
          </button>
        </div>
      </div>
    );
  }

  // Preview screen with shimmer
  return (
    <div className="min-h-screen flex flex-col p-6 bg-background">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => !isAnalyzing && setStep('upload')}
            className={`text-sm transition-colors ${isAnalyzing ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground'}`}
          >
            ← Back
          </button>
        </div>

        <div className="flex-1 flex flex-col space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isAnalyzing ? 'Analysing...' : 'Review your question'}
            </h2>
            <p className="text-muted-foreground">
              {isAnalyzing ? 'Orbit is figuring out how to help' : 'Add details to get better help'}
            </p>
          </div>

          {/* Image with shimmer effect when analyzing */}
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={imagePreview!}
              alt="Question"
              className={`w-full border border-border rounded-xl transition-all duration-300 ${isAnalyzing ? 'opacity-70' : ''}`}
            />
            {isAnalyzing && (
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <div 
                  className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0,250,215,0.15) 50%, transparent 100%)',
                  }}
                />
              </div>
            )}
            {!isAnalyzing && (
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/90 backdrop-blur-sm hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Text input - fades when analyzing */}
          <div className={`transition-opacity duration-300 ${isAnalyzing ? 'opacity-30 pointer-events-none' : ''}`}>
            <Textarea
              placeholder="Add context or specify what you need help with (optional)"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="min-h-[100px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isAnalyzing}
            />
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={analyzeAndSubmit}
              disabled={isAnalyzing}
              className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-70"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Thinking...
                </span>
              ) : (
                <>
                  Get Help
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
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
