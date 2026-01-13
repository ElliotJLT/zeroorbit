import { useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
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

  // Mobile layout - swipe-based sheet panels
  if (isMobile) {
    return (
      <div 
        className="flex flex-col h-screen w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
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
