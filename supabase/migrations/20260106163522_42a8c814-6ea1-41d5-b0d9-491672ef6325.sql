-- First, let's add a parent_id and section columns to organize topics hierarchically
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.topics(id);
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS section text; -- 'pure', 'statistics', 'mechanics'
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Clear existing topics and add the full A-Level Maths syllabus
DELETE FROM public.topics;

-- PURE MATHEMATICS TOPICS
-- A: Proof
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Proof', 'proof', 'pure', 1);

-- B: Algebra and Functions
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Algebra and Functions', 'algebra-and-functions', 'pure', 2);

-- C: Coordinate Geometry
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Coordinate Geometry', 'coordinate-geometry', 'pure', 3);

-- D: Sequences and Series
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Sequences and Series', 'sequences-and-series', 'pure', 4);

-- E: Trigonometry
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Trigonometry', 'trigonometry', 'pure', 5);

-- F: Exponentials and Logarithms
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Exponentials and Logarithms', 'exponentials-and-logarithms', 'pure', 6);

-- G: Differentiation
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Differentiation', 'differentiation', 'pure', 7);

-- H: Integration
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Integration', 'integration', 'pure', 8);

-- I: Numerical Methods
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Numerical Methods', 'numerical-methods', 'pure', 9);

-- J: Vectors
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Vectors', 'vectors', 'pure', 10);

-- STATISTICS TOPICS
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Statistical Sampling', 'statistical-sampling', 'statistics', 1),
  (gen_random_uuid(), 'Data Presentation and Interpretation', 'data-presentation', 'statistics', 2),
  (gen_random_uuid(), 'Probability', 'probability', 'statistics', 3),
  (gen_random_uuid(), 'Statistical Distributions', 'statistical-distributions', 'statistics', 4),
  (gen_random_uuid(), 'Statistical Hypothesis Testing', 'hypothesis-testing', 'statistics', 5);

-- MECHANICS TOPICS
INSERT INTO public.topics (id, name, slug, section, sort_order) VALUES 
  (gen_random_uuid(), 'Quantities and Units in Mechanics', 'quantities-and-units', 'mechanics', 1),
  (gen_random_uuid(), 'Kinematics', 'kinematics', 'mechanics', 2),
  (gen_random_uuid(), 'Forces and Newtons Laws', 'forces-and-newtons-laws', 'mechanics', 3),
  (gen_random_uuid(), 'Moments', 'moments', 'mechanics', 4);