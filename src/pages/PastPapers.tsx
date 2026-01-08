import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const handleSnapQuestion = () => {
    // Store current page info for context
    if (selectedPaper) {
      sessionStorage.setItem('paperContext', JSON.stringify({
        paperName: selectedPaper.name,
        page: currentPage,
      }));
    }
    setIsCapturing(true);
  };

  const handleCaptureAndChat = () => {
    // Navigate to chat with paper context
    const paperContext = selectedPaper 
      ? `I'm working on ${selectedPaper.name} (${selectedPaper.date}), page ${currentPage}.`
      : '';
    sessionStorage.setItem('initialContext', paperContext);
    navigate('/');
  };

  if (selectedPaper) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex items-center gap-3 p-4 border-b border-border">
          <button
            onClick={() => setSelectedPaper(null)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{selectedPaper.name}</h1>
            <p className="text-xs text-muted-foreground">{selectedPaper.date}</p>
          </div>
          <button
            onClick={() => setSelectedPaper(null)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4">
          <Document
            file={selectedPaper.path}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            }
            error={
              <div className="text-center p-8 text-muted-foreground">
                <p>Failed to load PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={Math.min(window.innerWidth - 32, 600)}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg rounded-lg overflow-hidden"
            />
          </Document>
        </div>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-border bg-background space-y-3">
          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Snap Question CTA */}
          <Button
            onClick={handleCaptureAndChat}
            className="w-full h-12 gap-2"
          >
            <Camera className="h-5 w-5" />
            <span>Snap a question from this page</span>
          </Button>
        </div>
      </div>
    );
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
