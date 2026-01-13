import { useState } from 'react';
import { ChevronLeft, ChevronRight, Crop, X, FileText } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import TextSelectionBar from '../TextSelectionBar';
import type { ActiveContent } from './types';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ContentPanelDesktopProps {
  content: ActiveContent;
  onClose: () => void;
  onReselectImage?: () => void;
  onReselectPdf?: (text: string, mode: 'coach' | 'check', page: number) => void;
}

export default function ContentPanelDesktop({
  content,
  onClose,
  onReselectImage,
  onReselectPdf,
}: ContentPanelDesktopProps) {
  const [currentPage, setCurrentPage] = useState(content?.pdfPage || 1);
  const [numPages, setNumPages] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [showSelectionBar, setShowSelectionBar] = useState(false);

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    
    if (text.length > 10) {
      setSelectedText(text);
      setShowSelectionBar(true);
    } else if (text.length === 0) {
      setShowSelectionBar(false);
      setSelectedText('');
    }
  };

  const handleModeSelect = (mode: 'coach' | 'check') => {
    if (selectedText && onReselectPdf) {
      onReselectPdf(selectedText, mode, currentPage);
      window.getSelection()?.removeAllRanges();
      setShowSelectionBar(false);
      setSelectedText('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Your Context
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="bg-muted/30 min-h-full">
          {content.type === 'image' && content.croppedImageUrl && (
            <div className="p-4">
              <img
                src={content.croppedImageUrl}
                alt="Question"
                className="w-full rounded-lg border border-border"
              />
              
              {onReselectImage && content.originalImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReselectImage}
                  className="w-full mt-4 gap-2"
                >
                  <Crop className="h-4 w-4" />
                  Select different section
                </Button>
              )}
            </div>
          )}

          {content.type === 'pdf' && content.pdfPath && (
            <div 
              className="flex flex-col items-center py-2"
              onMouseUp={handleSelectionChange}
            >
              <Document
                file={content.pdfPath}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setCurrentPage(content.pdfPage || 1);
                }}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  width={320}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                />
              </Document>

              <div className="flex items-center justify-center gap-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {numPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                  disabled={currentPage >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {showSelectionBar && selectedText && (
                <div className="px-4 w-full">
                  <TextSelectionBar
                    selectedText={selectedText}
                    onSelectMode={handleModeSelect}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
