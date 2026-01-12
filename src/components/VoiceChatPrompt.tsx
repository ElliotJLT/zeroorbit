import { useState } from 'react';
import { Mic } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import orbitLogo from '@/assets/orbit-logo.png';

interface VoiceChatPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartVoiceChat: () => void;
  showDontShowAgain?: boolean;
  sessionId?: string;
}

export default function VoiceChatPrompt({
  open,
  onOpenChange,
  onStartVoiceChat,
  showDontShowAgain = false,
  sessionId,
}: VoiceChatPromptProps) {
  const [hasResponded, setHasResponded] = useState(false);

  const recordInterest = async (interested: boolean) => {
    try {
      // Record to message_feedback table with special feedback_type
      if (sessionId) {
        await supabase.from('message_feedback').insert({
          session_id: sessionId,
          message_id: sessionId, // Use session_id as placeholder since this isn't message-specific
          feedback_type: interested ? 'voice_interest_yes' : 'voice_interest_no',
        });
      }
    } catch (error) {
      console.error('Failed to record voice interest:', error);
    }
  };

  const handleYes = async () => {
    await recordInterest(true);
    setHasResponded(true);
    // Don't actually start voice chat - just record interest
    setTimeout(() => {
      onOpenChange(false);
      setHasResponded(false);
    }, 2000);
  };

  const handleNo = async () => {
    await recordInterest(false);
    localStorage.setItem('orbitVoiceChatDismissed', 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-sm">
        <DialogHeader className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
              <img 
                src={orbitLogo} 
                alt="Orbit" 
                className="relative h-20 w-20 object-contain"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Voice Chat</span>
            </div>
          </div>
          
          {!hasResponded ? (
            <>
              <DialogTitle className="text-center text-xl">
                Would you use real-time voice?
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Talk through your thinking out loud with Orbit instead of typing. 
                Would this help you learn better?
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="text-center text-xl">
                Thanks for your feedback! 🎉
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                We're working on bringing voice chat to Orbit.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {!hasResponded && (
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleNo} 
              variant="outline" 
              className="flex-1 h-12 text-base"
            >
              No thanks
            </Button>
            <Button 
              onClick={handleYes} 
              className="flex-1 h-12 text-base gap-2"
            >
              <Mic className="h-4 w-4" />
              Yes, I'd use it!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
