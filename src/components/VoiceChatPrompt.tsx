import { useState } from 'react';
import { Volume2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface VoiceChatPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartVoiceChat: () => void;
  showDontShowAgain?: boolean;
}

export default function VoiceChatPrompt({
  open,
  onOpenChange,
  onStartVoiceChat,
  showDontShowAgain = false,
}: VoiceChatPromptProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStartVoiceChat = () => {
    if (dontShowAgain) {
      localStorage.setItem('orbitVoiceChatDismissed', 'true');
    }
    onStartVoiceChat();
    onOpenChange(false);
  };

  const handleNotNow = () => {
    if (dontShowAgain) {
      localStorage.setItem('orbitVoiceChatDismissed', 'true');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
            <Volume2 className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Try Voice Chat?</DialogTitle>
          <DialogDescription className="text-center">
            Have a real-time conversation with Orbit. Talk through problems naturally - 
            it's like having a tutor right there with you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <Button onClick={handleStartVoiceChat} className="w-full gap-2">
            <Volume2 className="h-4 w-4" />
            Start Voice Chat
          </Button>
          
          <Button variant="ghost" onClick={handleNotNow} className="w-full">
            Not now
          </Button>

          {showDontShowAgain && (
            <div className="flex items-center gap-2 justify-center">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label htmlFor="dontShowAgain" className="text-sm text-muted-foreground cursor-pointer">
                Don't show this again
              </Label>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
