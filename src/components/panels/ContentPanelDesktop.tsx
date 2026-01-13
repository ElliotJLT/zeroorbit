import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Crop, X, FileText, ImagePlus, Upload } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import TextSelectionBar from '../TextSelectionBar';
import type { ActiveContent } from './types';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ContentPanelDesktopProps {
  content: ActiveContent | null;
  onClose: () => void;
  onReselectImage?: () => void;
  onReselectPdf?: (text: string, mode: 'coach' | 'check', page: number) => void;
  onAddImage?: (file: File) => void;
  onAddPdf?: (file: File) => void;
}

export default function ContentPanelDesktop({
  content,
  onClose,
  onReselectImage,
  onReselectPdf,
  onAddImage,
  onAddPdf,
}: ContentPanelDesktopProps) {
  const [currentPage, setCurrentPage] = useState(content?.pdfPage || 1);
  const [numPages, setNumPages] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [showSelectionBar, setShowSelectionBar] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddImage) {
      onAddImage(file);
    }
    e.target.value = '';
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddPdf) {
      onAddPdf(file);
    }
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            My Context
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
      
      {/* Description */}
      <div className="px-3 py-2 border-b border-border/30">
        <p className="text-[11px] text-muted-foreground/70">
          Add images or documents to give Orbit context about what you're working on.
        </p>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="min-h-full">
          {/* Upload buttons when no content */}
          {!content && (
            <div className="p-4 space-y-3">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="w-full gap-2 justify-start"
              >
                <ImagePlus className="h-4 w-4" />
                Add image
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => pdfInputRef.current?.click()}
                className="w-full gap-2 justify-start"
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          )}

          {/* Image content */}
          {content?.type === 'image' && content.croppedImageUrl && (
            <div className="p-4">
              <img
                src={content.croppedImageUrl}
                alt="Question"
                className="w-full rounded-lg"
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

          {/* PDF content */}
          {content?.type === 'pdf' && content.pdfPath && (
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
