import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Swords, Settings, TrendingUp, FileText, Calculator } from 'lucide-react';
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
            {/* Calculator - Quick access tool */}
            <button
              onClick={() => handleAction(() => navigate('/calculator'))}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Calculator</p>
                <p className="text-sm text-muted-foreground">Scientific calculator</p>
              </div>
            </button>

            {/* Divider */}
            <div className="my-2 mx-4 border-t border-border" />

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

            {/* My Progress - Stats, streak & tokens */}
            <button
              onClick={() => handleAction(() => navigate('/progress'))}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">My Progress</p>
                <p className="text-sm text-muted-foreground">Stats, streak & tokens</p>
              </div>
            </button>

            {/* Divider */}
            <div className="my-2 mx-4 border-t border-border" />

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

        </div>
      </SheetContent>
    </Sheet>
  );
}
