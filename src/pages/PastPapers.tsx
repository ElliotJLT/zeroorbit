import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import PdfScanner from '@/components/PdfScanner';

const orbitPapers = [
  {
    id: 'edexcel-stats-june2024',
    name: 'Edexcel Statistics Paper 1',
    date: 'June 2024',
    path: '/papers/edexcel-statistics-paper1-june2024.pdf',
  },
];

const examBoardLinks = [
  {
    board: 'AQA',
    url: 'https://www.aqa.org.uk/find-past-papers-and-mark-schemes',
  },
  {
    board: 'Edexcel',
    url: 'https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html',
  },
  {
    board: 'OCR',
    url: 'https://www.ocr.org.uk/qualifications/past-paper-finder/',
  },
];

export default function PastPapers() {
  const navigate = useNavigate();
  const [selectedPaper, setSelectedPaper] = useState<typeof orbitPapers[0] | null>(null);

  if (selectedPaper) {
    return <PdfScanner paper={selectedPaper} onClose={() => setSelectedPaper(null)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Past Papers</h1>
      </header>

      {/* Hero */}
      <div className="p-6 text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Past Papers</h2>
        <p className="text-muted-foreground">
          Download a paper, snap any question with Orbit, and get step-by-step guidance.
        </p>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Orbit Papers */}
        {orbitPapers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">Practice with Orbit</h3>
            {orbitPapers.map((paper) => (
              <button
                key={paper.id}
                onClick={() => setSelectedPaper(paper)}
                className="w-full p-4 bg-primary/5 border border-primary/20 rounded-2xl hover:bg-primary/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{paper.name}</h4>
                    <p className="text-sm text-muted-foreground">{paper.date}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Exam Board Links */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Official exam board papers</h3>
          {examBoardLinks.map((board) => (
            <a
              key={board.board}
              href={board.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-muted rounded-2xl hover:bg-muted/80 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{board.board}</h4>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
