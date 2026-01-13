import { useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ContentPanel, { ActiveContent } from './ContentPanel';
import SourcesPanel, { Source } from './SourcesPanel';

interface StudyLayoutProps {
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
  onSettings: () => void;
}

export default function StudyLayout({
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
}: StudyLayoutProps) {
  const isMobile = useIsMobile();
  
  // Swipe gesture tracking
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
    
    // Only trigger on horizontal swipes (deltaX > deltaY) with minimum distance
    const minSwipeDistance = 80;
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && currentSources.length > 0) {
        // Swipe left - open sources panel (if we have sources)
        onSourcesOpenChange(true);
      } else if (deltaX > 0 && activeContent) {
        // Swipe right - open content panel (if we have content)
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
        {/* Main chat area */}
        {children}
        
        {/* Content Panel - sheet overlay (swipe-right to open) */}
        <ContentPanel
          open={contentPanelOpen}
          onOpenChange={onContentPanelOpenChange}
          content={activeContent}
          onReselectImage={onReselectImage}
          onReselectPdf={onReselectPdf}
          inline={false}
        />
        
        {/* Sources Panel - sheet overlay (swipe-left to open) */}
        <SourcesPanel
          open={sourcesOpen}
          onOpenChange={onSourcesOpenChange}
          sources={currentSources}
          activeSourceId={activeSourceId}
          inline={false}
        />
      </div>
    );
  }

  // Desktop layout - side-by-side inline columns
  return (
    <div className="flex h-screen w-full">
      {/* Content Panel - left column (inline, no sheet) */}
      <ContentPanel
        open={contentPanelOpen}
        onOpenChange={onContentPanelOpenChange}
        content={activeContent}
        onReselectImage={onReselectImage}
        onReselectPdf={onReselectPdf}
        inline={true}
      />
      
      {/* Main chat area - center */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
      
      {/* Sources Panel - right column (inline, no sheet) */}
      <SourcesPanel
        open={sourcesOpen}
        onOpenChange={onSourcesOpenChange}
        sources={currentSources}
        activeSourceId={activeSourceId}
        inline={true}
      />
    </div>
  );
}
