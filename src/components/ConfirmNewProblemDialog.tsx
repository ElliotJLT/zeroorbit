import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';

interface ConfirmNewProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const DONT_ASK_KEY = 'orbitDontAskNewProblem';

export default function ConfirmNewProblemDialog({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmNewProblemDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Check if we should skip the dialog
  useEffect(() => {
    if (open) {
      const shouldSkip = localStorage.getItem(DONT_ASK_KEY) === 'true';
      if (shouldSkip) {
        onConfirm();
        onOpenChange(false);
      }
    }
  }, [open, onConfirm, onOpenChange]);

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem(DONT_ASK_KEY, 'true');
    }
    onConfirm();
    onOpenChange(false);
  };

  // Don't render if we should skip
  if (localStorage.getItem(DONT_ASK_KEY) === 'true') {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Start new problem?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear the current conversation and start fresh.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="dontAskAgain"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked === true)}
          />
          <label
            htmlFor="dontAskAgain"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Don't ask me again
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            New Problem
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
