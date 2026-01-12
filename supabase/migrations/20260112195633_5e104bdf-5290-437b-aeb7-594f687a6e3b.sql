-- Add sources column to messages table for storing citation data
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT NULL;

-- Add index for faster queries on messages with sources
CREATE INDEX IF NOT EXISTS idx_messages_sources ON public.messages USING GIN (sources) WHERE sources IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.sources IS 'JSON array of source citations: [{id: number, title: string, explanation: string, exam_relevance?: string}]';