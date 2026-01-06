import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BetaEntryModalProps {
  open: boolean;
  onComplete: (name: string) => void;
}

export default function BetaEntryModal({ open, onComplete }: BetaEntryModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      localStorage.setItem('betaTesterName', name.trim());
      onComplete(name.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to the Beta Test 🧪</DialogTitle>
          <DialogDescription className="text-base">
            Thanks for testing Orbit! Enter your name to get started.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Input
            placeholder="Your name (e.g., Alex)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="h-12"
            autoFocus
          />
          
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full h-12"
          >
            Start Testing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
