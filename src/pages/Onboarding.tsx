import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const onboardingSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name'),
  yearGroup: z.string().min(1, 'Please select your year'),
  examBoard: z.string().min(1, 'Please select your exam board'),
  targetGrade: z.string().min(1, 'Please select your target grade'),
});

const yearOptions = ['Y12', 'Y13'];
const examBoardOptions = ['AQA', 'Edexcel', 'OCR', 'Not sure'];
const gradeOptions = ['B', 'A', 'A*'];

export default function Onboarding() {
  const [fullName, setFullName] = useState('');
  const [yearGroup, setYearGroup] = useState('');
  const [examBoard, setExamBoard] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = onboardingSchema.safeParse({
      fullName,
      yearGroup,
      examBoard,
      targetGrade,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
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
      toast({
        title: 'Profile saved!',
        description: "Let's start learning.",
      });
      navigate('/home');
    }
  };

  const SelectButton = ({
    value,
    selected,
    onClick,
  }: {
    value: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-xl font-medium transition-all duration-200 border",
        selected
          ? "bg-primary/20 border-primary text-primary"
          : "bg-surface-2 border-border hover:border-primary/50"
      )}
    >
      {value}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
          <CardDescription>
            We'll personalise your learning experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year group</label>
              <div className="flex gap-2">
                {yearOptions.map((year) => (
                  <SelectButton
                    key={year}
                    value={year}
                    selected={yearGroup === year}
                    onClick={() => setYearGroup(year)}
                  />
                ))}
              </div>
              {errors.yearGroup && (
                <p className="text-sm text-destructive">{errors.yearGroup}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Exam board</label>
              <div className="flex flex-wrap gap-2">
                {examBoardOptions.map((board) => (
                  <SelectButton
                    key={board}
                    value={board}
                    selected={examBoard === board}
                    onClick={() => setExamBoard(board)}
                  />
                ))}
              </div>
              {errors.examBoard && (
                <p className="text-sm text-destructive">{errors.examBoard}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target grade</label>
              <div className="flex gap-2">
                {gradeOptions.map((grade) => (
                  <SelectButton
                    key={grade}
                    value={grade}
                    selected={targetGrade === grade}
                    onClick={() => setTargetGrade(grade)}
                  />
                ))}
              </div>
              {errors.targetGrade && (
                <p className="text-sm text-destructive">{errors.targetGrade}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="pill-lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
