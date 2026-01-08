import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className }: MathTextProps) {
  // Split text by LaTeX delimiters and render appropriately
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+\$)/g);
  
  return (
    <span className={className}>
      {parts.map((part, i) => {
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
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
