import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const examBoardOptions = [
  { value: 'AQA', label: 'AQA' },
  { value: 'Edexcel', label: 'Edexcel' },
  { value: 'OCR', label: 'OCR' },
  { value: 'Not sure', label: 'Not sure' },
];

export default function Settings() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [examBoard, setExamBoard] = useState(profile?.exam_board || '');
  const [reminders, setReminders] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const handleDarkModeToggle = (enabled: boolean) => {
    if (!enabled) {
      // Trying to switch to light mode
      toast({
        title: "Oops! Bulb needs replacing 💡",
        description: "Dark mode is the only way for now.",
      });
      return; // Don't change the state
    }
    setDarkMode(enabled);
  };

  useEffect(() => {
    if (profile?.exam_board) {
      setExamBoard(profile.exam_board);
    }
  }, [profile]);

  const handleExamBoardChange = async (value: string) => {
    setExamBoard(value);
    if (profile?.user_id) {
      await supabase
        .from('profiles')
        .update({ exam_board: value })
        .eq('user_id', profile.user_id);
      refreshProfile();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Exam Board */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Exam Board
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {examBoardOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleExamBoardChange(option.value)}
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

        {/* Reminders */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Study Reminders</p>
              <p className="text-sm text-muted-foreground">Daily practice notifications</p>
            </div>
          </div>
          <Switch
            checked={reminders}
            onCheckedChange={setReminders}
          />
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {darkMode ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Easier on the eyes</p>
            </div>
          </div>
          <Switch
            checked={darkMode}
            onCheckedChange={handleDarkModeToggle}
          />
        </div>
      </div>
    </div>
  );
}