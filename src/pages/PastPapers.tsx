import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react';

const paperLinks = [
  {
    board: 'AQA',
    years: ['2023', '2022', '2021', '2020'],
    url: 'https://www.aqa.org.uk/find-past-papers-and-mark-schemes',
  },
  {
    board: 'Edexcel',
    years: ['2023', '2022', '2021', '2020'],
    url: 'https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html',
  },
  {
    board: 'OCR',
    years: ['2023', '2022', '2021', '2020'],
    url: 'https://www.ocr.org.uk/qualifications/past-paper-finder/',
  },
];

export default function PastPapers() {
  const navigate = useNavigate();

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
        <h2 className="text-2xl font-semibold">Official Past Papers</h2>
        <p className="text-muted-foreground">
          Access past papers directly from your exam board. Snap any question to get help from Orbit.
        </p>
      </div>

      {/* Paper Links */}
      <div className="flex-1 p-4 space-y-4">
        {paperLinks.map((board) => (
          <a
            key={board.board}
            href={board.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-muted rounded-2xl hover:bg-muted/80 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{board.board}</h3>
                <p className="text-sm text-muted-foreground">
                  Papers available: {board.years.join(', ')}
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </a>
        ))}
      </div>

      {/* Tip */}
      <div className="p-4 mx-4 mb-4 bg-primary/10 rounded-2xl border border-primary/20">
        <p className="text-sm text-center">
          <span className="font-medium text-primary">Pro tip:</span>{' '}
          <span className="text-muted-foreground">
            Download a paper, snap any question with Orbit, and get step-by-step guidance!
          </span>
        </p>
      </div>
    </div>
  );
}