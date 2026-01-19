import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import BurgerMenu from './BurgerMenu';
import ConfirmNewProblemDialog from './ConfirmNewProblemDialog';
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
  onAddImage?: (file: File) => void;
  onAddPdf?: (file: File) => void;
  // Header actions
  onNewProblem: () => void;
  onSettings: () => void;
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
  onAddImage,
  onAddPdf,
  onNewProblem,
  onSettings,
}: StudyWorkspaceProps) {
  const isMobile = useIsMobile();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  // Auto-open content panel on desktop when content becomes available
  useEffect(() => {
    if (!isMobile && activeContent && !contentPanelOpen) {
      onContentPanelOpenChange(true);
    }
  }, [activeContent, isMobile]);
  
  // Auto-open sources panel on desktop (always show it)
  useEffect(() => {
    if (!isMobile && !sourcesOpen) {
      onSourcesOpenChange(true);
    }
  }, [isMobile]);
  
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
    const startX = touchStartRef.current.x;
    const screenWidth = window.innerWidth;
    
    // Require swipe to start from edge zones (40px from edges) to avoid Android back gesture conflict
    const isFromLeftEdge = startX < 40;
    const isFromRightEdge = startX > screenWidth - 40;
    
    const minSwipeDistance = 60;
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      // Swipe left (from right edge) → open My Learning
      if (deltaX < 0 && isFromRightEdge) {
        onSourcesOpenChange(true);
      }
      // Swipe right (from left edge) → open My Context
      else if (deltaX > 0 && isFromLeftEdge && activeContent) {
        onContentPanelOpenChange(true);
      }
    }
    
    touchStartRef.current = null;
  }, [activeContent, onSourcesOpenChange, onContentPanelOpenChange]);

  // Shared header component
  const Header = () => (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
      <BurgerMenu onSettings={onSettings} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmDialog(true)}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        New Problem
      </Button>
    </header>
  );

  // Shared confirm dialog
  const ConfirmDialog = () => (
    <ConfirmNewProblemDialog
      open={showConfirmDialog}
      onOpenChange={setShowConfirmDialog}
      onConfirm={onNewProblem}
    />
  );

  // Mobile layout - swipe-based sheet panels with edge indicators
  if (isMobile) {
    return (
      <div 
        className="flex flex-col h-screen w-full relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Header />
        
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        
        {/* Left edge dragger for content panel */}
        {activeContent && !contentPanelOpen && (
          <button
            onClick={() => onContentPanelOpenChange(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 h-24 w-1.5 rounded-r-full bg-border/60 hover:bg-primary/40 hover:w-2 transition-all duration-200"
            aria-label="Open context panel"
          />
        )}
        
        {/* Right edge dragger for learning panel - always visible */}
        {!sourcesOpen && (
          <button
            onClick={() => onSourcesOpenChange(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 h-24 w-1.5 rounded-l-full bg-border/60 hover:bg-primary/40 hover:w-2 transition-all duration-200"
            aria-label="Open learning panel"
          />
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
        
        <ConfirmDialog />
      </div>
    );
  }

  // Desktop layout - shared header + resizable 3-column layout
  const showContent = contentPanelOpen;
  const showSources = true; // Always show on desktop

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 overflow-hidden px-3 pb-3">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left panel - Content */}
          {showContent && (
            <>
              <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                <div className="h-full overflow-hidden">
                  <ContentPanelDesktop
                    content={activeContent}
                    onClose={() => onContentPanelOpenChange(false)}
                    onReselectImage={onReselectImage}
                    onReselectPdf={onReselectPdf}
                    onAddImage={onAddImage}
                    onAddPdf={onAddPdf}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          
          {/* Center panel - Chat */}
          <ResizablePanel defaultSize={showContent || showSources ? 50 : 100} minSize={30}>
            <div className="flex flex-col h-full min-w-0 rounded-b-2xl border-x border-b border-border/40 bg-card/50 overflow-hidden">
              {children}
            </div>
          </ResizablePanel>
          
          {/* Right panel - My Learning (always visible, narrower) */}
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
              <div className="h-full rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
              <SourcesPanelDesktop
                sources={currentSources}
                activeSourceId={activeSourceId}
              />
              </div>
            </ResizablePanel>
          </>
        </ResizablePanelGroup>
      </div>
      
      <ConfirmDialog />
    </div>
  );
}
