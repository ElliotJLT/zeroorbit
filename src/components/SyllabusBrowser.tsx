import { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Calculator, BarChart3, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Topic {
  id: string;
  name: string;
  slug: string;
  section: string | null;
  sort_order: number | null;
}

interface SyllabusBrowserProps {
  onSelectTopic: (topic: Topic) => void;
  onBack: () => void;
}

const sectionIcons = {
  pure: Calculator,
  statistics: BarChart3,
  mechanics: Compass,
};

const sectionLabels = {
  pure: 'Pure Mathematics',
  statistics: 'Statistics',
  mechanics: 'Mechanics',
};

export default function SyllabusBrowser({ onSelectTopic, onBack }: SyllabusBrowserProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('sort_order');

      if (!error && data) {
        setTopics(data as Topic[]);
      }
      setLoading(false);
    };

    fetchTopics();
  }, []);

  const groupedTopics = topics.reduce((acc, topic) => {
    const section = topic.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  const sections = ['pure', 'statistics', 'mechanics'].filter(s => groupedTopics[s]?.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading syllabus...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-medium flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          A-Level Maths Syllabus
        </h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-auto p-4">
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Select a topic you want help with
        </p>

        <div className="max-w-lg mx-auto space-y-3">
          {sections.map((section) => {
            const Icon = sectionIcons[section as keyof typeof sectionIcons] || BookOpen;
            const isActive = activeSection === section;
            const topicsInSection = groupedTopics[section] || [];

            return (
              <div key={section} className="rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setActiveSection(isActive ? null : section)}
                  className="w-full p-4 flex items-center gap-3 bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{sectionLabels[section as keyof typeof sectionLabels]}</p>
                    <p className="text-sm text-muted-foreground">{topicsInSection.length} topics</p>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isActive ? 'rotate-90' : ''}`} />
                </button>

                {isActive && (
                  <div className="border-t border-border bg-muted/20">
                    {topicsInSection.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => onSelectTopic(topic)}
                        className="w-full p-4 pl-16 flex items-center justify-between hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <span className="text-sm">{topic.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
