import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Swords, Sparkles, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  name: string;
  slug: string;
  section: string | null;
}

const sectionLabels: Record<string, string> = {
  pure: 'Pure Mathematics',
  statistics: 'Statistics',
  mechanics: 'Mechanics',
};

const difficultyLabels = [
  { level: 1, label: 'Foundation', description: 'Basic recall' },
  { level: 2, label: 'Standard', description: 'Core concepts' },
  { level: 3, label: 'Exam Ready', description: 'Typical exam questions' },
  { level: 4, label: 'Challenging', description: 'Harder problems' },
  { level: 5, label: 'Extension', description: 'A* territory' },
];

const questionLabels: Record<number, string> = {
  5: 'Quick burst',
  10: 'Solid session',
  15: 'Deep focus',
  20: 'Full workout',
};

export default function PracticeArena() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(3);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await supabase
        .from('topics')
        .select('*')
        .order('section')
        .order('sort_order');
      
      if (data) {
        setTopics(data);
      }
      setLoading(false);
    };
    fetchTopics();
  }, []);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const selectAllInSection = (section: string) => {
    const sectionTopicIds = topics
      .filter(t => t.section === section)
      .map(t => t.id);
    
    const allSelected = sectionTopicIds.every(id => selectedTopics.includes(id));
    
    if (allSelected) {
      setSelectedTopics(prev => prev.filter(id => !sectionTopicIds.includes(id)));
    } else {
      setSelectedTopics(prev => [...new Set([...prev, ...sectionTopicIds])]);
    }
  };

  const selectMixWeakAreas = () => {
    // For MVP, select a random mix of 3-5 topics
    const shuffled = [...topics].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length)).map(t => t.id);
    setSelectedTopics(selected);
  };

  const groupedTopics = topics.reduce((acc, topic) => {
    const section = topic.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  const handleStart = () => {
    sessionStorage.setItem('arenaTopics', JSON.stringify(selectedTopics));
    navigate(`/arena-session?difficulty=${difficulty}&count=${questionCount}`);
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
        <h1 className="text-lg font-semibold">Practice Arena</h1>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="p-6 pb-4 text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Swords className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Test your skills</h2>
          <p className="text-muted-foreground text-sm">
            AI-generated exam questions with instant feedback
          </p>
        </div>

        {/* For You Option - Pro Feature */}
        <div className="px-4 mb-8">
          <div
            className="w-full h-14 gap-2 border-2 border-dashed border-muted-foreground/30 rounded-2xl flex items-center justify-center bg-muted/30 opacity-70 cursor-not-allowed relative"
          >
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">For You</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-foreground text-background rounded-full flex items-center gap-1">
              <Lock className="h-3 w-3" />
              PRO
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Personalised practice based on your progress</p>
        </div>

        {/* Divider */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Custom Session</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* Settings Card */}
        <div className="px-4 mb-6">
          <div className="bg-muted/50 rounded-2xl p-5 space-y-6">
            {/* Difficulty Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Difficulty</label>
                <span className="text-sm font-medium text-primary">
                  {difficultyLabels[difficulty - 1].label}
                </span>
              </div>
              <Slider
                value={[difficulty]}
                onValueChange={(value) => setDifficulty(value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground text-center">
                {difficultyLabels[difficulty - 1].description}
              </p>
            </div>

            {/* Question Count Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Questions</label>
                <span className="text-sm font-medium text-primary">{questionCount}</span>
              </div>
              <Slider
                value={[questionCount]}
                onValueChange={(value) => setQuestionCount(value[0])}
                min={5}
                max={20}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground text-center">
                {questionLabels[questionCount]}
              </p>
            </div>
          </div>
        </div>

        {/* Topics Section Header */}
        <div className="px-4 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Select Topics</h3>
        </div>

        {/* Topics */}
        <div className="px-4 pb-4 space-y-5">
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(groupedTopics).map(([section, sectionTopics]) => {
            const allSelected = sectionTopics.every(t => selectedTopics.includes(t.id));
            const someSelected = sectionTopics.some(t => selectedTopics.includes(t.id));
            
            return (
              <div key={section} className="space-y-3">
                <button
                  onClick={() => selectAllInSection(section)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                    allSelected 
                      ? "bg-primary border-primary" 
                      : someSelected 
                        ? "border-primary" 
                        : "border-muted-foreground"
                  )}>
                    {allSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {someSelected && !allSelected && (
                      <div className="w-2 h-2 bg-primary rounded-sm" />
                    )}
                  </div>
                  {sectionLabels[section] || section}
                </button>
                
                <div className="grid gap-2">
                  {sectionTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                        selectedTopics.includes(topic.id)
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted border-2 border-transparent hover:border-border"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        selectedTopics.includes(topic.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      )}>
                        {selectedTopics.includes(topic.id) && (
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium">{topic.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* CTA */}
      <div className="p-4 border-t border-border shrink-0">
        <Button
          onClick={handleStart}
          disabled={selectedTopics.length === 0}
          className="w-full h-14 text-lg rounded-2xl font-medium transition-all"
        >
          {selectedTopics.length === 0 ? 'Select topics to continue' : (
            <>
              Start Arena ({questionCount} questions)
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
