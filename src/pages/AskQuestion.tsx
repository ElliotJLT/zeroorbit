import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  name: string;
  slug: string;
}

export default function AskQuestion() {
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [workingImage, setWorkingImage] = useState<File | null>(null);
  const [questionPreview, setQuestionPreview] = useState<string | null>(null);
  const [workingPreview, setWorkingPreview] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase.from('topics').select('*').order('name');
    if (data) setTopics(data);
  };

  const handleImageChange = (
    file: File | null,
    setImage: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      setPreview(null);
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

  const handleSubmit = async () => {
    if (!questionText.trim() && !questionImage) {
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
    }
    if (workingImage) {
      workingImageUrl = await uploadImage(workingImage, user.id);
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        question_text: questionText || 'See attached image',
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
    <div className="min-h-screen p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h2">Ask a question</h1>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your question</label>
          <Textarea
            placeholder="Type or paste your question here..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        {/* Question Image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Photo of question</label>
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
                setQuestionPreview
              )
            }
          />
          {questionPreview ? (
            <div className="relative">
              <img
                src={questionPreview}
                alt="Question"
                className="w-full h-40 object-cover rounded-xl border border-border"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80"
                onClick={() => handleImageChange(null, setQuestionImage, setQuestionPreview)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => questionInputRef.current?.click()}
            >
              <CardContent className="p-6 flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-8 w-8" />
                <span className="text-sm">Tap to take or upload a photo</span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Working Image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Photo of your working{' '}
            <span className="text-muted-foreground">(optional)</span>
          </label>
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
                setWorkingPreview
              )
            }
          />
          {workingPreview ? (
            <div className="relative">
              <img
                src={workingPreview}
                alt="Working"
                className="w-full h-40 object-cover rounded-xl border border-border"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80"
                onClick={() => handleImageChange(null, setWorkingImage, setWorkingPreview)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => workingInputRef.current?.click()}
            >
              <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Upload className="h-5 w-5" />
                <span className="text-sm">Add your working</span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Topic Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Topic{' '}
            <span className="text-muted-foreground">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() =>
                  setSelectedTopic(selectedTopic === topic.id ? '' : topic.id)
                }
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                  selectedTopic === topic.id
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface-2 border-border hover:border-primary/50"
                )}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          variant="hero"
          size="pill-xl"
          className="w-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating session...' : 'Get help'}
        </Button>
      </div>
    </div>
  );
}
