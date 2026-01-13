import { useState } from 'react';
import { ChevronLeft, ChevronRight, Crop } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import TextSelectionBar from '../TextSelectionBar';
import type { ActiveContent } from './types';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ContentPanelMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ActiveContent | null;
  onReselectImage?: () => void;
  onReselectPdf?: (text: string, mode: 'coach' | 'check', page: number) => void;
}

export default function ContentPanelMobile({
  open,
  onOpenChange,
  content,
  onReselectImage,
  onReselectPdf,
}: ContentPanelMobileProps) {
  const [currentPage, setCurrentPage] = useState(content?.pdfPage || 1);
  const [numPages, setNumPages] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [showSelectionBar, setShowSelectionBar] = useState(false);

  if (!content) return null;

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] sm:w-[450px] p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-base">
            {content.type === 'image' ? 'Your Question' : content.pdfName || 'PDF'}
          </SheetTitle>
        </SheetHeader>
        
        <div className="h-[calc(100vh-60px)] overflow-auto bg-muted/30">
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
                  onClick={() => {
                    onOpenChange(false);
                    onReselectImage();
                  }}
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
              onTouchEnd={handleSelectionChange}
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
                  width={Math.min(window.innerWidth * 0.8 - 32, 400)}
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
      </SheetContent>
    </Sheet>
  );
}
