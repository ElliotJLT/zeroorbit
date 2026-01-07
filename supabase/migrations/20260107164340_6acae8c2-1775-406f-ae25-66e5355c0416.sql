-- Add image_url column to messages table for storing attached images
ALTER TABLE public.messages ADD COLUMN image_url text;