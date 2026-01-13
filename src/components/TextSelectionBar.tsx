import { Button } from '@/components/ui/button';
import { GraduationCap, ClipboardCheck } from 'lucide-react';

interface TextSelectionBarProps {
  selectedText: string;
  onSelectMode: (mode: 'coach' | 'check') => void;
  className?: string;
}

export default function TextSelectionBar({
  selectedText,
  onSelectMode,
  className = '',
}: TextSelectionBarProps) {
  const previewText = selectedText.length > 80 
    ? selectedText.slice(0, 80) + '...' 
    : selectedText;

  return (
    <div className={`bg-background border border-border rounded-2xl shadow-lg p-4 space-y-3 ${className}`}>
      {/* Selected text preview */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
        <p className="text-sm line-clamp-2">{previewText}</p>
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-12 flex-col gap-1"
          onClick={() => onSelectMode('coach')}
        >
          <GraduationCap className="h-4 w-4" />
          <span className="text-xs">Coach me</span>
        </Button>
        <Button
          variant="outline"
          className="h-12 flex-col gap-1"
          onClick={() => onSelectMode('check')}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span className="text-xs">Check work</span>
        </Button>
      </div>
    </div>
  );
}
