-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true);

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'question-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to all images
CREATE POLICY "Anyone can view question images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'question-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'question-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);