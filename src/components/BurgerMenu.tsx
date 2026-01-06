import { useState } from 'react';
import { Menu, X, Camera, BookOpen, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface BurgerMenuProps {
  onNewProblem: () => void;
  onBrowseSyllabus: () => void;
  onSettings?: () => void;
}

export default function BurgerMenu({ onNewProblem, onBrowseSyllabus, onSettings }: BurgerMenuProps) {
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
      <SheetContent side="left" className="w-72 bg-sidebar-background border-sidebar-border p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            <span className="font-semibold text-lg">Menu</span>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-2">
            <button
              onClick={() => handleAction(onNewProblem)}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">New Problem</p>
                <p className="text-sm text-muted-foreground">Snap or type a question</p>
              </div>
            </button>

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
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground text-center">
              Built with Zero Gravity mentors
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
