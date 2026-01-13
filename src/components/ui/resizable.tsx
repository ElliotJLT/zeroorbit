import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "group relative flex w-[3px] items-center justify-center bg-border/50 transition-all duration-200",
      "hover:bg-primary/40 hover:w-[4px]",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2",
      "data-[panel-group-direction=vertical]:h-[3px] data-[panel-group-direction=vertical]:w-full",
      "data-[panel-group-direction=vertical]:hover:h-[4px]",
      "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-4 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
      "[&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {/* Mint gradient glow on hover */}
    <div className="absolute inset-y-0 -left-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md" />
    </div>
    
    {withHandle && (
      <div className="z-10 flex h-8 w-1.5 items-center justify-center rounded-full bg-border/80 group-hover:bg-primary/60 transition-colors duration-200">
        <div className="h-4 w-0.5 rounded-full bg-muted-foreground/40 group-hover:bg-primary-foreground/60 transition-colors" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
