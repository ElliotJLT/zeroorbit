import { useRef } from 'react';
import { Camera, Swords, Calculator, BarChart3, Compass, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BurgerMenu from '@/components/BurgerMenu';
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
  isAuthenticated?: boolean;
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
  isAuthenticated = false,
  onSnapQuestion,
  onSelectTopic,
  onTestMe,
  onSignIn,
}: HomeScreenProps) {
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
      {/* Header - 44pt touch targets per Apple HIG */}
      <header className="p-4 flex items-center justify-between border-b border-border">
        <BurgerMenu />
        {!isAuthenticated && (
          <button 
            onClick={onSignIn} 
            className="h-11 px-4 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            Sign in
          </button>
        )}
        {isAuthenticated && <div className="w-11" />}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Hero Section */}
          <div className="text-center py-6">
            <div className="relative inline-block mb-5 grain-overlay">
              <div className="absolute w-56 h-56 logo-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              <img src={orbitLogo} alt="Orbit" className="relative h-48 w-auto mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">A-Level Maths Tutor</h1>
            <p className="text-muted-foreground">AQA • Edexcel • OCR</p>
          </div>

          {/* Primary CTA - Snap a Question (min 44pt height, active feedback) */}
          <Button
            onClick={onSnapQuestion}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold text-lg shadow-lg transition-all"
          >
            <Camera className="h-6 w-6" />
            <span>Snap a Question</span>
          </Button>

          {/* Value Proposition */}
          <p className="text-center text-sm text-muted-foreground px-4">
            Stuck on a question? Snap it. Get coached through it step-by-step.
          </p>

          {/* Or Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Arena CTA (min 44pt height, active feedback) */}
          <Button
            onClick={onTestMe}
            variant="outline"
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-primary/30 hover:bg-primary/5 active:scale-[0.98] font-medium text-base transition-all"
          >
            <Swords className="h-5 w-5 text-primary" />
            <span>Test yourself in our Arena</span>
          </Button>

          {/* Topics Preview (non-interactive) */}
          <div className="space-y-3 opacity-60">
            <p className="text-xs text-muted-foreground text-center">Orbit covers the full A-Level syllabus</p>
            
            {loadingTopics ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
            ) : (
              <div className="space-y-2">
                {sections.map((section) => {
                  const Icon = sectionIcons[section as keyof typeof sectionIcons] || BookOpen;
                  const topicsInSection = groupedTopics[section] || [];

                  return (
                    <div key={section} className="rounded-xl border border-border overflow-hidden">
                      <div className="p-4 flex items-center gap-3 bg-card">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{sectionLabels[section as keyof typeof sectionLabels]}</p>
                          <p className="text-sm text-muted-foreground">{topicsInSection.length} topics</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-5 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Built with</span>
          <img src={orbitIcon} alt="Zero Gravity" className="h-8 w-auto" />
        </div>
      </footer>
    </div>
  );
}
