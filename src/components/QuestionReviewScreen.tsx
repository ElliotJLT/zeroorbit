import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCw, Check, ArrowRight, Loader2 } from 'lucide-react';

interface QuestionReviewScreenProps {
  imageUrl: string;
  analysisResult?: { topic?: string; difficulty?: string } | null;
  isAnalyzing?: boolean;
  onComplete: (croppedImageUrl: string, mode: 'coach' | 'check') => void;
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
const HANDLE_SIZE = 44; // Increased for better mobile touch targets
const HANDLE_HIT_AREA = 44; // 44pt minimum touch target

export default function QuestionReviewScreen({
  imageUrl,
  analysisResult,
  isAnalyzing = false,
  onComplete,
  onCancel,
}: QuestionReviewScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCrop, setInitialCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [selectedMode, setSelectedMode] = useState<'coach' | 'check' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate display size and initialize crop
  useEffect(() => {
    if (!image || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32;
    const containerHeight = container.clientHeight - 32;

    const isRotated = rotation % 180 !== 0;
    const imgWidth = isRotated ? image.height : image.width;
    const imgHeight = isRotated ? image.width : image.height;

    const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight, 1);
    const displayWidth = imgWidth * scale;
    const displayHeight = imgHeight * scale;

    setDisplaySize({ width: displayWidth, height: displayHeight });

    // Initialize crop to full image with small margin
    const margin = 0.05;
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
    const halfHit = HANDLE_HIT_AREA / 2;

    // Check corners first with larger hit area for mobile
    if (Math.abs(x - cx) < halfHit && Math.abs(y - cy) < halfHit) return 'tl';
    if (Math.abs(x - (cx + cw)) < halfHit && Math.abs(y - cy) < halfHit) return 'tr';
    if (Math.abs(x - cx) < halfHit && Math.abs(y - (cy + ch)) < halfHit) return 'bl';
    if (Math.abs(x - (cx + cw)) < halfHit && Math.abs(y - (cy + ch)) < halfHit) return 'br';
    
    // Check if inside crop area for move
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

  const getCroppedImage = (): string => {
    if (!image || !canvasRef.current) return imageUrl;

    const isRotated = rotation % 180 !== 0;
    const actualWidth = isRotated ? image.height : image.width;
    const actualHeight = isRotated ? image.width : image.height;
    const scaleX = actualWidth / displaySize.width;
    const scaleY = actualHeight / displaySize.height;

    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return imageUrl;

    const cropWidth = cropRect.width * scaleX;
    const cropHeight = cropRect.height * scaleY;

    outputCanvas.width = cropWidth;
    outputCanvas.height = cropHeight;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return imageUrl;

    tempCanvas.width = actualWidth;
    tempCanvas.height = actualHeight;

    tempCtx.translate(actualWidth / 2, actualHeight / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);

    const drawWidth = isRotated ? actualHeight : actualWidth;
    const drawHeight = isRotated ? actualWidth : actualHeight;
    tempCtx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

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

    return outputCanvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSubmit = () => {
    if (!selectedMode) return;
    setIsSubmitting(true);
    const croppedUrl = getCroppedImage();
    onComplete(croppedUrl, selectedMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium">Review Your Question</span>
        <div className="w-10" />
      </div>

      {/* Image editor area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/90 min-h-0"
      >
        <div
          className="relative touch-none"
          style={{ width: displaySize.width, height: displaySize.height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} className="absolute inset-0" />

          {/* Overlay outside crop */}
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
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cropMask)" />
          </svg>

          {/* Crop border + handles */}
          <div
            className="absolute border-2 border-primary pointer-events-none"
            style={{
              left: cropRect.x,
              top: cropRect.y,
              width: cropRect.width,
              height: cropRect.height,
            }}
          >
            {['tl', 'tr', 'bl', 'br'].map((corner) => (
              <div
                key={corner}
                className="absolute w-7 h-7 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
                style={{
                  left: corner.includes('l') ? 0 : '100%',
                  top: corner.includes('t') ? 0 : '100%',
                }}
              />
            ))}
          </div>

          {/* Rotate button inside image area */}
          <button
            onClick={() => handleRotate('cw')}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background p-4 space-y-4 shrink-0">
        {/* Mode selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedMode('coach')}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              selectedMode === 'coach'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'coach' ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}>
                {selectedMode === 'coach' && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              <span className="font-medium text-sm">🎓 Coach me</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">Step-by-step guidance</p>
          </button>

          <button
            onClick={() => setSelectedMode('check')}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              selectedMode === 'check'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'check' ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}>
                {selectedMode === 'check' && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              <span className="font-medium text-sm">📝 Check work</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">Mark my answer</p>
          </button>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedMode || isAnalyzing || isSubmitting}
          className="w-full h-12"
        >
          {isAnalyzing || isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isAnalyzing ? 'Analyzing...' : 'Starting...'}
            </>
          ) : (
            <>
              Start Learning
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
