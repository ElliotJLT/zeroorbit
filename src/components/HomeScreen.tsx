import { useState, useRef } from 'react';
import { Camera, Shuffle, ChevronRight, Calculator, BarChart3, Compass, BookOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import orbitLogo from '@/assets/orbit-logo.png';
import orbitIcon from '@/assets/orbit-icon.png';

interface Topic {
  id: string;
  name: string;
  slug: string;
  section: string | null;
}

interface HomeScreenProps {
  topics: Topic[];
  loadingTopics: boolean;
  onSnapQuestion: () => void;
  onSelectTopic: (topic: Topic) => void;
  onTestMe: () => void;
  onSignIn: () => void;
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

export default function HomeScreen({
  topics,
  loadingTopics,
  onSnapQuestion,
  onSelectTopic,
  onTestMe,
  onSignIn,
  onShowInfo,
}: HomeScreenProps & { onShowInfo?: () => void }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedTopics = topics.reduce((acc, topic) => {
    const section = topic.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

  const sections = ['pure', 'statistics', 'mechanics'].filter(s => groupedTopics[s]?.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border">
        <button 
          onClick={onShowInfo}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <Info className="h-5 w-5 text-muted-foreground" />
        </button>
        <button onClick={onSignIn} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign in
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Hero Section */}
          <div className="text-center py-6">
            <div className="relative inline-block mb-4">
              <div 
                className="absolute w-32 h-32 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ background: 'radial-gradient(circle, rgba(0,250,215,0.3) 0%, transparent 70%)' }}
              />
              <img src={orbitLogo} alt="Orbit" className="relative h-24 w-auto mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">A-Level Maths Tutor</h1>
            <p className="text-muted-foreground">AQA • Edexcel • OCR</p>
          </div>

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Test Me Button */}
            <Button
              onClick={onTestMe}
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-foreground"
            >
              <Shuffle className="h-6 w-6 text-primary" />
              <span className="font-medium">Test Me</span>
            </Button>

            {/* Snap Question Button */}
            <Button
              onClick={onSnapQuestion}
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-2xl bg-card hover:bg-muted border border-border text-foreground"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="font-medium">Snap Question</span>
            </Button>
          </div>

          {/* Syllabus Browser */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-medium">Browse Syllabus</h2>
            </div>

            {loadingTopics ? (
              <div className="text-center py-8 text-muted-foreground">Loading syllabus...</div>
            ) : (
              <div className="space-y-2">
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
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-border text-center">
        <img src={orbitIcon} alt="Zero Gravity" className="h-6 w-auto mx-auto mb-1 opacity-50" />
        <p className="text-xs text-muted-foreground">
          Built with Zero Gravity
        </p>
      </footer>
    </div>
  );
}
