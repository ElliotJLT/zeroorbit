import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Swords, Settings, TrendingUp, FileText, Calculator, Lock, LogIn } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';

interface BurgerMenuProps {
  onBrowseSyllabus?: () => void;
  onSettings?: () => void;
}

export default function BurgerMenu({ onSettings }: BurgerMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  const menuItems = [
    { icon: Calculator, label: 'Calculator', description: 'Scientific calculator', path: '/calculator', dividerAfter: true },
    { icon: Swords, label: 'Practice Arena', description: 'Test your skills on any topic', path: '/practice-arena' },
    { icon: FileText, label: 'Past Papers', description: 'Official exam board papers', path: '/past-papers' },
    { icon: TrendingUp, label: 'My Progress', description: 'Stats, streak & tokens', path: '/progress', dividerAfter: true },
    { icon: Settings, label: 'Settings', description: 'Exam board & preferences', path: '/settings', isSettings: true },
  ];

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

          {/* Sign in CTA for non-logged-in users */}
          {!user && (
            <div className="p-4 border-b border-border">
              <button
                onClick={() => handleAction(() => navigate('/auth'))}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in to unlock
              </button>
            </div>
          )}

          {/* Menu Items */}
          <nav className="flex-1 p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isLocked = !user;
              
              return (
                <div key={item.path}>
                  <button
                    onClick={() => isLocked ? handleAction(() => navigate('/auth')) : handleAction(() => navigate(item.path))}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left ${
                      isLocked ? 'opacity-60' : 'hover:bg-sidebar-accent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.isSettings ? 'bg-muted' : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${item.isSettings ? 'text-muted-foreground' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {isLocked && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {item.dividerAfter && <div className="my-2 mx-4 border-t border-border" />}
                </div>
              );
            })}
          </nav>

        </div>
      </SheetContent>
    </Sheet>
  );
}
