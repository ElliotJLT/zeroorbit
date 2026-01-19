import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
import orbitIcon from '@/assets/orbit-icon.png';

export function PWAInstallBanner() {
  const { canInstall, promptInstall, dismiss } = usePWAInstall();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show for signed-in users after a short delay
    if (canInstall && user) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [canInstall, user]);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in md:left-auto md:right-6 md:max-w-sm">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <img 
            src={orbitIcon} 
            alt="Orbit" 
            className="w-10 h-10 rounded-xl"
          />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Install Orbit
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for quick access
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-muted-foreground"
            onClick={handleDismiss}
          >
            Not now
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-mint text-mint-foreground hover:bg-mint/90"
            onClick={handleInstall}
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
