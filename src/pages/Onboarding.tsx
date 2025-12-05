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
import orbitLogo from '@/assets/orbit-logo.png';

const onboardingSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name'),
  yearGroup: z.string().min(1, 'Please select your year'),
  examBoard: z.string().min(1, 'Please select your exam board'),
  targetGrade: z.string().min(1, 'Please select your target grade'),
  tier: z.string().optional(),
});

const yearOptions = [
  { value: 'Y10', label: 'Year 10', level: 'GCSE' },
  { value: 'Y11', label: 'Year 11', level: 'GCSE' },
  { value: 'Y12', label: 'Year 12', level: 'A-Level' },
  { value: 'Y13', label: 'Year 13', level: 'A-Level' },
];

const examBoardOptions = [
  { value: 'AQA', label: 'AQA' },
  { value: 'Edexcel', label: 'Edexcel' },
  { value: 'OCR', label: 'OCR' },
  { value: 'Not sure', label: 'Not sure' },
];

const tierOptions = [
  { value: 'Higher', label: 'Higher', description: 'Grades 4-9' },
  { value: 'Foundation', label: 'Foundation', description: 'Grades 1-5' },
];

const gcseGradeOptions = [
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
];

const aLevelGradeOptions = [
  { value: 'B', label: 'B' },
  { value: 'A', label: 'A' },
  { value: 'A*', label: 'A*' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [examBoard, setExamBoard] = useState('');
  const [tier, setTier] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isGCSE = yearGroup === 'Y10' || yearGroup === 'Y11';
  const totalSteps = isGCSE ? 5 : 4;

  const handleSubmit = async () => {
    const validation = onboardingSchema.safeParse({
      fullName,
      yearGroup,
      examBoard,
      targetGrade,
      tier: isGCSE ? tier : undefined,
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
        tier: isGCSE ? tier : null,
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
      
      if (sessionStorage.getItem('pendingQuestion')) {
        navigate('/ask');
      } else {
        navigate('/home');
      }
    }
  };

  const canProceed = () => {
    if (isGCSE) {
      switch (step) {
        case 1: return fullName.length >= 2;
        case 2: return yearGroup.length > 0;
        case 3: return examBoard.length > 0;
        case 4: return tier.length > 0;
        case 5: return targetGrade.length > 0;
        default: return false;
      }
    } else {
      switch (step) {
        case 1: return fullName.length >= 2;
        case 2: return yearGroup.length > 0;
        case 3: return examBoard.length > 0;
        case 4: return targetGrade.length > 0;
        default: return false;
      }
    }
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const gradeOptions = isGCSE ? gcseGradeOptions : aLevelGradeOptions;
  const gradeStep = isGCSE ? 5 : 4;
  const tierStep = 4; // Only for GCSE

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={orbitLogo} alt="Orbit" className="h-12 w-auto" />
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
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
                <h1 className="text-2xl font-semibold">What's your name?</h1>
                <p className="text-muted-foreground">So we know what to call you</p>
              </div>
              <Input
                placeholder="Your first name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-14 text-lg rounded-2xl text-center bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">Which year are you in?</h1>
              </div>
              <div className="grid gap-3">
                {yearOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setYearGroup(option.value);
                      // Reset tier and grade when changing year
                      setTier('');
                      setTargetGrade('');
                    }}
                    className={cn(
                      "p-5 rounded-2xl text-left transition-all duration-200 bg-muted border-2",
                      yearGroup === option.value
                        ? "border-primary"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <span className="font-medium text-lg">{option.label}</span>
                    <span className="text-sm text-muted-foreground ml-2">({option.level})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">What's your exam board?</h1>
                <p className="text-muted-foreground">Don't worry if you're not sure</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {examBoardOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExamBoard(option.value)}
                    className={cn(
                      "p-4 rounded-2xl font-medium transition-all duration-200 bg-muted border-2",
                      examBoard === option.value
                        ? "border-primary"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isGCSE && step === tierStep && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">Which tier are you taking?</h1>
                <p className="text-muted-foreground">This affects the questions you'll see</p>
              </div>
              <div className="grid gap-3">
                {tierOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTier(option.value)}
                    className={cn(
                      "p-5 rounded-2xl text-left transition-all duration-200 bg-muted border-2",
                      tier === option.value
                        ? "border-primary"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <span className="font-medium text-lg">{option.label}</span>
                    <span className="text-sm text-muted-foreground ml-2">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === gradeStep && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">What's your target grade?</h1>
                <p className="text-muted-foreground">We'll push you to get there</p>
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                {gradeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTargetGrade(option.value)}
                    className={cn(
                      "w-20 h-20 rounded-2xl font-bold text-2xl transition-all duration-200 bg-muted border-2",
                      targetGrade === option.value
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
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
            className="w-full h-14 text-lg rounded-2xl font-medium transition-all text-white"
            style={{ 
              background: '#111416',
              border: '1px solid #00FAD7',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 16px rgba(0,250,215,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            {loading ? 'Saving...' : step === totalSteps ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Let's go
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