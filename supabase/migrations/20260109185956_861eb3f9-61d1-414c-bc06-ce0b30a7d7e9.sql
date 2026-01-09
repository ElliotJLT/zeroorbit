-- Create table to store eval test results
CREATE TABLE public.eval_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  test_setup TEXT NOT NULL,
  student_input TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  red_flags TEXT[] NOT NULL,
  orbit_response TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  red_flags_found TEXT[],
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for querying by run
CREATE INDEX idx_eval_results_run_id ON public.eval_results(run_id);
CREATE INDEX idx_eval_results_created_at ON public.eval_results(created_at DESC);

-- Enable RLS
ALTER TABLE public.eval_results ENABLE ROW LEVEL SECURITY;

-- Allow admins to view and manage eval results
CREATE POLICY "Admins can view eval results"
ON public.eval_results
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert eval results"
ON public.eval_results
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access for eval_results"
ON public.eval_results
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');