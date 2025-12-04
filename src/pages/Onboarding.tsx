import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const onboardingSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name'),
  yearGroup: z.string().min(1, 'Please select your year'),
  examBoard: z.string().min(1, 'Please select your exam board'),
  targetGrade: z.string().min(1, 'Please select your target grade'),
});

const yearOptions = [
  { value: 'Y12', label: 'Year 12', emoji: '📚' },
  { value: 'Y13', label: 'Year 13', emoji: '🎓' },
];

const examBoardOptions = [
  { value: 'AQA', label: 'AQA' },
  { value: 'Edexcel', label: 'Edexcel' },
  { value: 'OCR', label: 'OCR' },
  { value: 'Not sure', label: 'Not sure' },
];

const gradeOptions = [
  { value: 'B', label: 'B', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'A', label: 'A', color: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'A*', label: 'A*', color: 'bg-secondary/20 text-secondary border-secondary/30' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [examBoard, setExamBoard] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    const validation = onboardingSchema.safeParse({
      fullName,
      yearGroup,
      examBoard,
      targetGrade,
    });

    if (!validation.success) {
      toast({
        variant: 'destructive',
        title: 'Please fill in all fields',
      });
      return;
    }

    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        year_group: yearGroup,
        exam_board: examBoard,
        target_grade: targetGrade,
        onboarding_completed: true,
      })
      .eq('user_id', user.id);

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving profile',
        description: error.message,
      });
    } else {
      await refreshProfile();
      
      // Check if there's a pending question
      if (sessionStorage.getItem('pendingQuestion')) {
        navigate('/ask');
      } else {
        navigate('/home');
      }
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return fullName.length >= 2;
      case 2: return yearGroup !== '';
      case 3: return examBoard !== '';
      case 4: return targetGrade !== '';
      default: return false;
    }
  };

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-all duration-300",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-4xl">👋</span>
                <h1 className="text-2xl font-bold font-display">What's your name?</h1>
                <p className="text-muted-foreground">So we know what to call you</p>
              </div>
              <Input
                placeholder="Your first name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-14 text-lg rounded-2xl text-center"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-4xl">📚</span>
                <h1 className="text-2xl font-bold font-display">Which year are you in?</h1>
              </div>
              <div className="grid gap-3">
                {yearOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setYearGroup(option.value)}
                    className={cn(
                      "p-5 rounded-2xl text-left transition-all duration-200 glass-card border-2",
                      yearGroup === option.value
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <span className="text-2xl mr-3">{option.emoji}</span>
                    <span className="font-medium text-lg">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-4xl">📋</span>
                <h1 className="text-2xl font-bold font-display">What's your exam board?</h1>
                <p className="text-muted-foreground">Don't worry if you're not sure</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {examBoardOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExamBoard(option.value)}
                    className={cn(
                      "p-4 rounded-2xl font-medium transition-all duration-200 glass-card border-2",
                      examBoard === option.value
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-4xl">🎯</span>
                <h1 className="text-2xl font-bold font-display">What's your target grade?</h1>
                <p className="text-muted-foreground">We'll help you get there!</p>
              </div>
              <div className="flex gap-3 justify-center">
                {gradeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTargetGrade(option.value)}
                    className={cn(
                      "w-20 h-20 rounded-2xl font-bold text-2xl transition-all duration-200 border-2",
                      targetGrade === option.value
                        ? option.color + " border-current scale-110"
                        : "glass-card border-transparent hover:scale-105"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="pt-8">
          <Button
            onClick={nextStep}
            disabled={!canProceed() || loading}
            className="w-full h-14 text-lg rounded-2xl btn-primary"
          >
            {loading ? 'Saving...' : step === 4 ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Let's go!
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
