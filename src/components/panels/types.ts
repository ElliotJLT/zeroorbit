export interface ActiveContent {
  type: 'image' | 'pdf';
  croppedImageUrl?: string;
  originalImageUrl?: string;
  pdfPath?: string;
  pdfPage?: number;
  pdfName?: string;
  pdfDate?: string;
  selectedText?: string;
}

export interface Source {
  id: number;
  title: string;
  explanation: string;
  exam_relevance?: string;
}
