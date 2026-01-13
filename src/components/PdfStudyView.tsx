import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import TextSelectionBar from './TextSelectionBar';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfStudyViewProps {
  paper: {
    id: string;
    name: string;
    date: string;
    path: string;
  };
  initialPage?: number;
  onClose: () => void;
  onSelectText: (text: string, mode: 'coach' | 'check', page: number) => void;
}

export default function PdfStudyView({ 
  paper, 
  initialPage = 1,
  onClose,
  onSelectText,
}: PdfStudyViewProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedText, setSelectedText] = useState('');
  const [showSelectionBar, setShowSelectionBar] = useState(false);
  const [selectionBarPosition, setSelectionBarPosition] = useState({ bottom: 100 });
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfWidth = Math.min(window.innerWidth - 16, 800);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    
    if (text.length > 10) {
      setSelectedText(text);
      setShowSelectionBar(true);
      
      // Position the bar above the selection
      const range = selection?.getRangeAt(0);
      if (range && pdfContainerRef.current) {
        const rect = range.getBoundingClientRect();
        const containerRect = pdfContainerRef.current.getBoundingClientRect();
        // Position from bottom of container
        const bottom = containerRect.bottom - rect.top + 20;
        setSelectionBarPosition({ bottom: Math.max(100, Math.min(bottom, 400)) });
      }
    } else if (text.length === 0) {
      setShowSelectionBar(false);
      setSelectedText('');
    }
  }, []);

  // Listen for selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleModeSelect = (mode: 'coach' | 'check') => {
    if (selectedText) {
      onSelectText(selectedText, mode, currentPage);
      // Clear selection
      window.getSelection()?.removeAllRanges();
      setShowSelectionBar(false);
      setSelectedText('');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Clear any selection when changing pages
    window.getSelection()?.removeAllRanges();
    setShowSelectionBar(false);
    setSelectedText('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-3 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{paper.name}</h1>
          <p className="text-xs text-muted-foreground">{paper.date}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* PDF Viewer with Text Layer */}
      <div 
        ref={pdfContainerRef}
        className="flex-1 overflow-auto bg-black/90 relative"
      >
        <div className="flex justify-center py-2">
          <Document
            file={paper.path}
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
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>

        {/* Selection Action Bar */}
        {showSelectionBar && selectedText && (
          <div 
            className="fixed left-4 right-4 z-50"
            style={{ bottom: selectionBarPosition.bottom }}
          >
            <TextSelectionBar
              selectedText={selectedText}
              onSelectMode={handleModeSelect}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-3 border-t border-border bg-background shrink-0">
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {currentPage} of {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Hint text */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Select text from the PDF to get help
        </p>
      </div>
    </div>
  );
}
