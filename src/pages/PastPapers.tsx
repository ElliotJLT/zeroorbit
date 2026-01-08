import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, ChevronLeft, ChevronRight, X, Camera, Move } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';

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

interface ScannerPosition {
  y: number;
  height: number;
}

export default function PastPapers() {
  const navigate = useNavigate();
  const [selectedPaper, setSelectedPaper] = useState<typeof orbitPapers[0] | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scannerPos, setScannerPos] = useState<ScannerPosition>({ y: 100, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const initialPos = useRef({ y: 0, height: 0 });

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    initialPos.current = { y: scannerPos.y, height: scannerPos.height };
    
    if (type === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  };

  const handleDrag = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = clientY - dragStartY.current;
    
    if (isDragging) {
      const newY = Math.max(0, initialPos.current.y + delta);
      setScannerPos(prev => ({ ...prev, y: newY }));
    } else if (isResizing) {
      const newHeight = Math.max(100, Math.min(400, initialPos.current.height + delta));
      setScannerPos(prev => ({ ...prev, height: newHeight }));
    }
  }, [isDragging, isResizing]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Attach global listeners for drag
  useState(() => {
    const onMove = (e: TouchEvent | MouseEvent) => handleDrag(e);
    const onEnd = () => handleDragEnd();
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  });

  const handleCaptureAndChat = () => {
    // Store context about what question area was selected
    const paperContext = selectedPaper 
      ? `I'm working on ${selectedPaper.name} (${selectedPaper.date}), page ${currentPage}. I've selected a specific question from this page.`
      : '';
    sessionStorage.setItem('initialContext', paperContext);
    navigate('/');
  };

  if (selectedPaper) {
    // Calculate PDF width - make it larger, almost full width
    const pdfWidth = Math.min(window.innerWidth - 16, 800);
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex items-center gap-3 p-3 border-b border-border shrink-0">
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

        {/* PDF Viewer with Scanner Overlay */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-black/90 relative"
        >
          <div className="flex justify-center py-2">
            <div className="relative">
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
                  width={pdfWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Dark overlay above scanner */}
              <div 
                className="absolute left-0 right-0 top-0 bg-black/60 pointer-events-none"
                style={{ height: scannerPos.y }}
              />
              
              {/* Dark overlay below scanner */}
              <div 
                className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none"
                style={{ top: scannerPos.y + scannerPos.height }}
              />

              {/* Scanner Rectangle */}
              <div
                className="absolute left-2 right-2 border-2 border-primary rounded-2xl"
                style={{ 
                  top: scannerPos.y, 
                  height: scannerPos.height,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px rgba(0,250,215,0.3)',
                }}
              >
                {/* Corner indicators */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg" />

                {/* Drag handle - center */}
                <div
                  onMouseDown={(e) => handleDragStart(e, 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'move')}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center cursor-grab active:cursor-grabbing"
                >
                  <Move className="h-4 w-4 text-primary" />
                </div>

                {/* Resize handle - bottom */}
                <div
                  onMouseDown={(e) => handleDragStart(e, 'resize')}
                  onTouchStart={(e) => handleDragStart(e, 'resize')}
                  className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-12 h-6 rounded-full bg-primary flex items-center justify-center cursor-ns-resize"
                >
                  <div className="w-6 h-1 bg-primary-foreground/70 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="p-3 border-t border-border bg-background space-y-2 shrink-0">
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
            className="w-full h-11 gap-2"
          >
            <Camera className="h-5 w-5" />
            <span>Snap this question</span>
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
