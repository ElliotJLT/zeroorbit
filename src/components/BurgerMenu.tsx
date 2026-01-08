import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Swords, Settings, TrendingUp, FileText, Crown } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface BurgerMenuProps {
  onBrowseSyllabus?: () => void;
  onSettings?: () => void;
}

export default function BurgerMenu({ onSettings }: BurgerMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
            {/* Practice Arena */}
            <button
              onClick={() => handleAction(() => navigate('/practice-arena'))}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Swords className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Practice Arena</p>
                <p className="text-sm text-muted-foreground">Test your skills on any topic</p>
              </div>
            </button>

            {/* Past Papers */}
            <button
              onClick={() => handleAction(() => navigate('/past-papers'))}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Past Papers</p>
                <p className="text-sm text-muted-foreground">Official exam board papers</p>
              </div>
            </button>

            {/* My Progress - Locked until Arena */}
            <div className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted/30 opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center relative">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <Crown className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">My Progress</p>
                <p className="text-sm text-muted-foreground/70">Complete a Practice Arena to unlock</p>
              </div>
            </div>

            {/* Settings */}
            <button
              onClick={() => handleAction(() => navigate('/settings'))}
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