import { useState } from 'react';
import { Menu, BookOpen, Settings, TrendingUp, Lock, FileText, HelpCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface BurgerMenuProps {
  onBrowseSyllabus: () => void;
  onSettings?: () => void;
}

export default function BurgerMenu({ onBrowseSyllabus, onSettings }: BurgerMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 rounded-full hover:bg-muted transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-80 bg-background border-border p-0">
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-lg">Menu</span>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-2">
            <button
              onClick={() => handleAction(onBrowseSyllabus)}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Browse Syllabus</p>
                <p className="text-sm text-muted-foreground">Pick a topic to practice</p>
              </div>
            </button>

            {/* Past Papers - Locked */}
            <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted/30 opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center relative">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted-foreground flex items-center justify-center">
                  <Lock className="h-2.5 w-2.5 text-background" />
                </div>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Past Papers</p>
                <p className="text-sm text-muted-foreground/70">Coming soon</p>
              </div>
            </div>

            {/* My Progress - Locked */}
            <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted/30 opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center relative">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted-foreground flex items-center justify-center">
                  <Lock className="h-2.5 w-2.5 text-background" />
                </div>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">My Progress</p>
                <p className="text-sm text-muted-foreground/70">Coming soon</p>
              </div>
            </div>

            {onSettings && (
              <button
                onClick={() => handleAction(onSettings)}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Settings</p>
                  <p className="text-sm text-muted-foreground">Exam board & preferences</p>
                </div>
              </button>
            )}

            {/* Help */}
            <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted/30 opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Help</p>
                <p className="text-sm text-muted-foreground/70">Coming soon</p>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Built with Zero Gravity mentors
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
