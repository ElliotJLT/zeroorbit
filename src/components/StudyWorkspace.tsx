import { useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Image, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ContentPanelDesktop from './panels/ContentPanelDesktop';
import ContentPanelMobile from './panels/ContentPanelMobile';
import SourcesPanelDesktop from './panels/SourcesPanelDesktop';
import SourcesPanelMobile from './panels/SourcesPanelMobile';
import type { ActiveContent } from './panels/types';
import type { Source } from './panels/types';

interface StudyWorkspaceProps {
  children: React.ReactNode;
  activeContent: ActiveContent | null;
  currentSources: Source[];
  activeSourceId?: number;
  sourcesOpen: boolean;
  onSourcesOpenChange: (open: boolean) => void;
  contentPanelOpen: boolean;
  onContentPanelOpenChange: (open: boolean) => void;
  onReselectImage?: () => void;
  onReselectPdf?: (text: string, mode: 'coach' | 'check', page: number) => void;
}

export default function StudyWorkspace({
  children,
  activeContent,
  currentSources,
  activeSourceId,
  sourcesOpen,
  onSourcesOpenChange,
  contentPanelOpen,
  onContentPanelOpenChange,
  onReselectImage,
  onReselectPdf,
}: StudyWorkspaceProps) {
  const isMobile = useIsMobile();
  
  // Auto-open content panel on desktop when content becomes available
  useEffect(() => {
    if (!isMobile && activeContent && !contentPanelOpen) {
      onContentPanelOpenChange(true);
    }
  }, [activeContent, isMobile]);
  
  // Auto-open sources panel on desktop when sources become available
  useEffect(() => {
    if (!isMobile && currentSources.length > 0 && !sourcesOpen) {
      onSourcesOpenChange(true);
    }
  }, [currentSources, isMobile]);
  
  // Swipe gesture tracking for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    const minSwipeDistance = 80;
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && currentSources.length > 0) {
        onSourcesOpenChange(true);
      } else if (deltaX > 0 && activeContent) {
        onContentPanelOpenChange(true);
      }
    }
    
    touchStartRef.current = null;
  }, [currentSources, activeContent, onSourcesOpenChange, onContentPanelOpenChange]);

  // Mobile layout - swipe-based sheet panels with edge indicators
  if (isMobile) {
    return (
      <div 
        className="flex flex-col h-screen w-full relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {/* Left edge indicator for content panel */}
        {activeContent && !contentPanelOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onContentPanelOpenChange(true)}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-40 h-12 w-8 rounded-r-lg bg-muted/80 backdrop-blur-sm border border-l-0 border-border shadow-lg"
          >
            <Image className="h-4 w-4" />
          </Button>
        )}
        
        {/* Right edge indicator for sources panel */}
        {currentSources.length > 0 && !sourcesOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSourcesOpenChange(true)}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-40 h-12 w-8 rounded-l-lg bg-muted/80 backdrop-blur-sm border border-r-0 border-border shadow-lg"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
        )}
        
        <ContentPanelMobile
          open={contentPanelOpen}
          onOpenChange={onContentPanelOpenChange}
          content={activeContent}
          onReselectImage={onReselectImage}
          onReselectPdf={onReselectPdf}
        />
        
        <SourcesPanelMobile
          open={sourcesOpen}
          onOpenChange={onSourcesOpenChange}
          sources={currentSources}
          activeSourceId={activeSourceId}
        />
      </div>
    );
  }

  // Desktop layout - resizable 3-column layout
  const showContent = contentPanelOpen && activeContent;
  const showSources = sourcesOpen && currentSources.length > 0;

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Content */}
        {showContent && (
          <>
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <ContentPanelDesktop
                content={activeContent}
                onClose={() => onContentPanelOpenChange(false)}
                onReselectImage={onReselectImage}
                onReselectPdf={onReselectPdf}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        
        {/* Center panel - Chat */}
        <ResizablePanel defaultSize={showContent || showSources ? 50 : 100} minSize={30}>
          <div className="flex flex-col h-full min-w-0">
            {children}
          </div>
        </ResizablePanel>
        
        {/* Right panel - Sources */}
        {showSources && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <SourcesPanelDesktop
                sources={currentSources}
                activeSourceId={activeSourceId}
                onClose={() => onSourcesOpenChange(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
