import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, X, Sparkles, Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import orbitLogo from '@/assets/orbit-logo.png';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

const CONTEXT_CHIPS = [
  { label: "I don't know where to start", value: "I don't know where to start with this question." },
  { label: "Check my working", value: "Can you check my working and tell me where I went wrong?" },
  { label: "Explain step by step", value: "Please explain this step by step so I can understand." },
  { label: "Help me revise this topic", value: "I need help revising this topic - can you walk me through it?" },
];

export default function AskQuestion() {
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [workingImage, setWorkingImage] = useState<File | null>(null);
  const [questionPreview, setQuestionPreview] = useState<string | null>(null);
  const [workingPreview, setWorkingPreview] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  
  // OCR state
  const [detectedText, setDetectedText] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isEditingOcr, setIsEditingOcr] = useState(false);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const workingInputRef = useRef<HTMLInputElement>(null);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchTopics();
    loadPendingQuestion();
  }, []);

  const loadPendingQuestion = () => {
    const pending = sessionStorage.getItem('pendingQuestion');
    if (pending) {
      try {
        const { text, image } = JSON.parse(pending);
        if (text) setQuestionText(text);
        if (image) setQuestionPreview(image);
        sessionStorage.removeItem('pendingQuestion');
      } catch (e) {
        console.error('Error loading pending question:', e);
      }
    }
  };

  const fetchTopics = async () => {
    const { data } = await supabase.from('topics').select('*').order('name');
    if (data) setTopics(data);
  };

  const runOcr = async (imageBase64: string) => {
    setIsOcrLoading(true);
    setDetectedText(null);
    
    try {
      const response = await supabase.functions.invoke('analyze-question', {
        body: { 
          imageBase64,
          ocrOnly: true 
        }
      });

      if (response.data?.detectedText) {
        setDetectedText(response.data.detectedText);
      }
    } catch (error) {
      console.error('OCR error:', error);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleImageChange = (
    file: File | null,
    setImage: (f: File | null) => void,
    setPreview: (s: string | null) => void,
    shouldOcr = false
  ) => {
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        if (shouldOcr) {
          runOcr(result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      setPreview(null);
      if (shouldOcr) {
        setDetectedText(null);
      }
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('question-images')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('question-images')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const base64ToFile = async (base64: string, filename: string): Promise<File | null> => {
    try {
      const res = await fetch(base64);
      const blob = await res.blob();
      return new File([blob], filename, { type: blob.type });
    } catch {
      return null;
    }
  };

  const handleChipClick = (value: string) => {
    setQuestionText(prev => {
      if (prev.trim()) {
        return prev + ' ' + value;
      }
      return value;
    });
  };

  const handleSubmit = async () => {
    if (!questionText.trim() && !questionPreview) {
      toast({
        variant: 'destructive',
        title: 'Please add a question',
        description: 'Type your question or upload a photo',
      });
      return;
    }

    if (!user) return;

    setLoading(true);

    let questionImageUrl: string | null = null;
    let workingImageUrl: string | null = null;

    if (questionImage) {
      questionImageUrl = await uploadImage(questionImage, user.id);
    } else if (questionPreview && questionPreview.startsWith('data:')) {
      const file = await base64ToFile(questionPreview, 'question.jpg');
      if (file) {
        questionImageUrl = await uploadImage(file, user.id);
      }
    }

    if (workingImage) {
      workingImageUrl = await uploadImage(workingImage, user.id);
    }

    // Combine detected text with user context
    const finalQuestionText = detectedText 
      ? `${detectedText}\n\nStudent's context: ${questionText || 'None provided'}`
      : questionText || 'See attached image';

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        question_text: finalQuestionText,
        question_image_url: questionImageUrl,
        working_image_url: workingImageUrl,
        topic_id: selectedTopic || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error creating session',
        description: error.message,
      });
    } else {
      navigate(`/chat/${session.id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={orbitLogo} alt="Orbit" className="h-6 w-auto" />
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6 pb-32">
        {/* Question Image */}
        <div className="space-y-3 animate-fade-in">
          <h3 className="font-medium">Photo of question</h3>
          <input
            ref={questionInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) =>
              handleImageChange(
                e.target.files?.[0] || null,
                setQuestionImage,
                setQuestionPreview,
                true // Run OCR
              )
            }
          />
          {questionPreview ? (
            <div className="relative">
              <img
                src={questionPreview}
                alt="Question"
                className="w-full h-48 object-cover rounded-2xl border border-border"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full"
                onClick={() => {
                  handleImageChange(null, setQuestionImage, setQuestionPreview, true);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => questionInputRef.current?.click()}
              className="upload-zone w-full rounded-2xl p-6 flex flex-col items-center gap-3"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,250,215,0.15)' }}
              >
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Tap to take or upload a photo</span>
            </button>
          )}
          
          {/* OCR Result */}
          {questionPreview && (
            <div className="space-y-2">
              {isOcrLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Reading question...</span>
                </div>
              ) : detectedText ? (
                <div className="p-3 bg-muted rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Detected question</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsEditingOcr(!isEditingOcr)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {isEditingOcr ? 'Done' : 'Edit'}
                    </Button>
                  </div>
                  {isEditingOcr ? (
                    <Textarea
                      value={detectedText}
                      onChange={(e) => setDetectedText(e.target.value)}
                      className="min-h-[80px] text-sm bg-background"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{detectedText}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Context Chips */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-semibold">What do you need help with?</h2>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.value)}
                className="px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 border bg-muted border-transparent hover:border-primary hover:bg-primary/10"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context Text */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <Textarea
            placeholder="Tell Orbit what you're stuck on (e.g. 'I don't get what m means' or 'check my method')."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="min-h-[100px] rounded-2xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Working Image */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h3 className="font-medium">
            Your working <span className="text-muted-foreground font-normal">(optional)</span>
          </h3>
          <input
            ref={workingInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) =>
              handleImageChange(
                e.target.files?.[0] || null,
                setWorkingImage,
                setWorkingPreview,
                false
              )
            }
          />
          {workingPreview ? (
            <div className="relative">
              <img
                src={workingPreview}
                alt="Working"
                className="w-full h-32 object-cover rounded-2xl border border-border"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full"
                onClick={() => handleImageChange(null, setWorkingImage, setWorkingPreview, false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => workingInputRef.current?.click()}
              className="upload-zone w-full rounded-2xl p-4 flex items-center justify-center gap-2"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add your working</span>
            </button>
          )}
        </div>

        {/* Topic Selection */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h3 className="font-medium">
            Topic <span className="text-muted-foreground font-normal">(optional)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() =>
                  setSelectedTopic(selectedTopic === topic.id ? '' : topic.id)
                }
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                  selectedTopic === topic.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted border-transparent hover:border-border"
                )}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={loading || (!questionText.trim() && !questionPreview)}
            className="w-full h-14 text-lg rounded-2xl font-medium transition-all text-white"
            style={{ 
              background: '#111416',
              border: '1px solid #00FAD7',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(0,250,215,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            {loading ? 'Creating session...' : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Get help
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}