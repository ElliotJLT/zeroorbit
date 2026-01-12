import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { cn } from '@/lib/utils';

interface CitationTextProps {
  text: string;
  className?: string;
  onCitationClick?: (sourceId: number) => void;
  hasSources?: boolean;
}

export default function CitationText({ 
  text, 
  className, 
  onCitationClick,
  hasSources = false 
}: CitationTextProps) {
  // First split by LaTeX delimiters, then handle citations within text parts
  const latexParts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+\$)/g);
  
  const renderTextWithCitations = (textPart: string, keyPrefix: string) => {
    // Split by citation markers [1], [2], etc.
    const citationParts = textPart.split(/(\[\d+\])/g);
    
    return citationParts.map((part, j) => {
      const citationMatch = part.match(/^\[(\d+)\]$/);
      if (citationMatch && hasSources) {
        const sourceId = parseInt(citationMatch[1], 10);
        return (
          <button
            key={`${keyPrefix}-cit-${j}`}
            onClick={() => onCitationClick?.(sourceId)}
            className={cn(
              "inline-flex items-center justify-center",
              "min-w-[1.25rem] h-5 px-1.5 mx-0.5",
              "text-[10px] font-semibold",
              "bg-primary/20 text-primary",
              "rounded-full",
              "hover:bg-primary/30 hover:scale-105",
              "transition-all duration-150",
              "cursor-pointer"
            )}
            aria-label={`View source ${sourceId}`}
          >
            {sourceId}
          </button>
        );
      }
      return <span key={`${keyPrefix}-txt-${j}`}>{part}</span>;
    });
  };
  
  return (
    <span className={className}>
      {latexParts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Block math
          const math = part.slice(2, -2).trim();
          try {
            return <BlockMath key={i} math={math} />;
          } catch {
            return <span key={i}>{part}</span>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Inline math
          const math = part.slice(1, -1).trim();
          try {
            return <InlineMath key={i} math={math} />;
          } catch {
            return <span key={i}>{part}</span>;
          }
        }
        // Regular text - check for citations
        return (
          <span key={i}>
            {renderTextWithCitations(part, `part-${i}`)}
          </span>
        );
      })}
    </span>
  );
}
