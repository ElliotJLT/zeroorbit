import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, RotateCcw, RotateCw } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onComplete: (editedImageUrl: string) => void;
  onCancel: () => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragHandle = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;

const MIN_CROP_SIZE = 50;
const HANDLE_SIZE = 24;

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageUrl,
  onComplete,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCrop, setInitialCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate display size and initialize crop
  useEffect(() => {
    if (!image || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // padding
    const containerHeight = container.clientHeight - 32;

    // Account for rotation
    const isRotated = rotation % 180 !== 0;
    const imgWidth = isRotated ? image.height : image.width;
    const imgHeight = isRotated ? image.width : image.height;

    const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight, 1);
    const displayWidth = imgWidth * scale;
    const displayHeight = imgHeight * scale;

    setDisplaySize({ width: displayWidth, height: displayHeight });

    // Initialize crop to full image with 10% margin
    const margin = 0.1;
    setCropRect({
      x: displayWidth * margin,
      y: displayHeight * margin,
      width: displayWidth * (1 - margin * 2),
      height: displayHeight * (1 - margin * 2),
    });
  }, [image, rotation]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !image || displaySize.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    ctx.save();
    ctx.translate(displaySize.width / 2, displaySize.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const isRotated = rotation % 180 !== 0;
    const drawWidth = isRotated ? displaySize.height : displaySize.width;
    const drawHeight = isRotated ? displaySize.width : displaySize.height;

    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [image, rotation, displaySize]);

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => (prev + (direction === 'cw' ? 90 : -90)) % 360);
  };

  const getHandleAtPoint = (x: number, y: number): DragHandle => {
    const { x: cx, y: cy, width: cw, height: ch } = cropRect;
    const halfHandle = HANDLE_SIZE / 2;

    // Check corners
    if (Math.abs(x - cx) < halfHandle && Math.abs(y - cy) < halfHandle) return 'tl';
    if (Math.abs(x - (cx + cw)) < halfHandle && Math.abs(y - cy) < halfHandle) return 'tr';
    if (Math.abs(x - cx) < halfHandle && Math.abs(y - (cy + ch)) < halfHandle) return 'bl';
    if (Math.abs(x - (cx + cw)) < halfHandle && Math.abs(y - (cy + ch)) < halfHandle) return 'br';

    // Check if inside crop area
    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return 'move';

    return null;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = getHandleAtPoint(x, y);
    if (handle) {
      setDragHandle(handle);
      setDragStart({ x, y });
      setInitialCrop({ ...cropRect });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [cropRect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragHandle) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    let newCrop = { ...initialCrop };

    if (dragHandle === 'move') {
      newCrop.x = Math.max(0, Math.min(displaySize.width - initialCrop.width, initialCrop.x + dx));
      newCrop.y = Math.max(0, Math.min(displaySize.height - initialCrop.height, initialCrop.y + dy));
    } else {
      // Handle corner resizing
      if (dragHandle.includes('l')) {
        const newX = Math.max(0, Math.min(initialCrop.x + initialCrop.width - MIN_CROP_SIZE, initialCrop.x + dx));
        newCrop.width = initialCrop.width + (initialCrop.x - newX);
        newCrop.x = newX;
      }
      if (dragHandle.includes('r')) {
        newCrop.width = Math.max(MIN_CROP_SIZE, Math.min(displaySize.width - initialCrop.x, initialCrop.width + dx));
      }
      if (dragHandle.includes('t')) {
        const newY = Math.max(0, Math.min(initialCrop.y + initialCrop.height - MIN_CROP_SIZE, initialCrop.y + dy));
        newCrop.height = initialCrop.height + (initialCrop.y - newY);
        newCrop.y = newY;
      }
      if (dragHandle.includes('b')) {
        newCrop.height = Math.max(MIN_CROP_SIZE, Math.min(displaySize.height - initialCrop.y, initialCrop.height + dy));
      }
    }

    setCropRect(newCrop);
  }, [dragHandle, dragStart, initialCrop, displaySize]);

  const handlePointerUp = useCallback(() => {
    setDragHandle(null);
  }, []);

  const handleComplete = () => {
    if (!image || !canvasRef.current) return;

    // Calculate the scale between display and actual image
    const isRotated = rotation % 180 !== 0;
    const actualWidth = isRotated ? image.height : image.width;
    const actualHeight = isRotated ? image.width : image.height;
    const scaleX = actualWidth / displaySize.width;
    const scaleY = actualHeight / displaySize.height;

    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    const cropWidth = cropRect.width * scaleX;
    const cropHeight = cropRect.height * scaleY;

    outputCanvas.width = cropWidth;
    outputCanvas.height = cropHeight;

    // Draw rotated image to temp canvas first
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = actualWidth;
    tempCanvas.height = actualHeight;

    tempCtx.translate(actualWidth / 2, actualHeight / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);

    const drawWidth = isRotated ? actualHeight : actualWidth;
    const drawHeight = isRotated ? actualWidth : actualHeight;
    tempCtx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    // Crop from temp canvas
    outputCtx.drawImage(
      tempCanvas,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.9);
    onComplete(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium">Adjust Photo</span>
        <Button variant="ghost" size="icon" onClick={handleComplete}>
          <Check className="h-5 w-5 text-primary" />
        </Button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/90"
      >
        <div
          className="relative"
          style={{ width: displaySize.width, height: displaySize.height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Image canvas */}
          <canvas ref={canvasRef} className="absolute inset-0" />

          {/* Overlay outside crop area */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={displaySize.width}
            height={displaySize.height}
          >
            <defs>
              <mask id="cropMask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={cropRect.x}
                  y={cropRect.y}
                  width={cropRect.width}
                  height={cropRect.height}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.6)"
              mask="url(#cropMask)"
            />
          </svg>

          {/* Crop rectangle border and handles */}
          <div
            className="absolute border-2 border-primary pointer-events-none"
            style={{
              left: cropRect.x,
              top: cropRect.y,
              width: cropRect.width,
              height: cropRect.height,
            }}
          >
            {/* Corner handles */}
            {['tl', 'tr', 'bl', 'br'].map((corner) => (
              <div
                key={corner}
                className="absolute w-6 h-6 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: corner.includes('l') ? 0 : '100%',
                  top: corner.includes('t') ? 0 : '100%',
                }}
              />
            ))}

            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rotate controls */}
      <div className="flex items-center justify-center gap-8 p-6 border-t border-border">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={() => handleRotate('ccw')}
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={() => handleRotate('cw')}
        >
          <RotateCw className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default ImageEditor;
