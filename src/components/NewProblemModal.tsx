import { useState, useRef } from 'react';
import { Camera, Upload, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageEditor } from '@/components/ImageEditor';

interface NewProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (imageUrl: string | null, questionText: string) => void;
  isAnalyzing?: boolean;
}

export default function NewProblemModal({
  open,
  onOpenChange,
  onSubmit,
  isAnalyzing = false,
}: NewProblemModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setIsEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditorComplete = (editedImageUrl: string) => {
    setImagePreview(editedImageUrl);
    setIsEditing(false);
    setRawImage(null);
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setRawImage(null);
  };

  const handleUploadFromGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRawImage(reader.result as string);
          setIsEditing(true);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = () => {
    if (imagePreview || questionText.trim()) {
      onSubmit(imagePreview, questionText);
      // Reset after submit
      setImagePreview(null);
      setQuestionText('');
    }
  };

  const handleClose = () => {
    if (!isAnalyzing) {
      setImagePreview(null);
      setQuestionText('');
      onOpenChange(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
  };

  // Show image editor as fullscreen overlay
  if (isEditing && rawImage) {
    return (
      <ImageEditor
        imageUrl={rawImage}
        onComplete={handleEditorComplete}
        onCancel={handleEditorCancel}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border p-0 gap-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-center">New Problem</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageChange}
          />

          {imagePreview ? (
            // Image preview
            <div className="relative">
              <img
                src={imagePreview}
                alt="Question"
                className="w-full rounded-xl border border-border"
              />
              {!isAnalyzing && (
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-2 rounded-full bg-background/90 backdrop-blur-sm hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            // Upload buttons
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 flex flex-col items-center gap-3 transition-all hover:border-primary hover:bg-primary/10"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,250,215,0.2)' }}
                >
                  <Camera className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Take Photo</p>
                  <p className="text-sm text-muted-foreground">Snap your question</p>
                </div>
              </button>

              <button
                onClick={handleUploadFromGallery}
                className="w-full p-3 rounded-xl border border-border bg-card flex items-center justify-center gap-2 transition-all hover:bg-muted"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload from gallery</span>
              </button>
            </div>
          )}

          {/* Or divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or type your question</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Text input */}
          <Textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type or paste your question here..."
            className="min-h-[100px] rounded-xl bg-muted border-0 resize-none focus-visible:ring-1 focus-visible:ring-primary"
            disabled={isAnalyzing}
          />
        </div>

        {/* Submit button */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={isAnalyzing || (!imagePreview && !questionText.trim())}
            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Thinking...
              </span>
            ) : (
              <>
                Get Help
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
