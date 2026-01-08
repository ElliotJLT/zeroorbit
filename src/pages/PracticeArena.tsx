import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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

export default function PracticeArena() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
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

  const groupedTopics = topics.reduce((acc, topic) => {
    const section = topic.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  const handleStart = () => {
    // Store selected topics and navigate to test
    sessionStorage.setItem('practiceTopics', JSON.stringify(selectedTopics));
    navigate('/');
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

      {/* Hero */}
      <div className="p-6 text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Swords className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Test your skills</h2>
        <p className="text-muted-foreground">
          Select the topics you want to practice. We'll generate questions to challenge you.
        </p>
      </div>

      {/* Topics */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                        "flex items-center gap-3 p-4 rounded-xl transition-all text-left",
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

      {/* CTA */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleStart}
          disabled={selectedTopics.length === 0}
          className="w-full h-14 text-lg rounded-2xl font-medium transition-all text-white"
          style={{ 
            background: selectedTopics.length > 0 ? '#111416' : undefined,
            border: selectedTopics.length > 0 ? '1px solid #00FAD7' : undefined,
          }}
        >
          {selectedTopics.length === 0 ? 'Select topics to continue' : (
            <>
              Start Practice
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}