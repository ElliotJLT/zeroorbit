-- Add fluency tracking fields to arena_attempts
ALTER TABLE public.arena_attempts 
ADD COLUMN IF NOT EXISTS hints_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_spent_sec integer;