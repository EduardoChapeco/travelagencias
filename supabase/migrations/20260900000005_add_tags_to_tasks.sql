-- Add tags to tasks for universal tagging system
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Create an index to support fast filtering by tags
CREATE INDEX IF NOT EXISTS tasks_tags_idx ON public.tasks USING GIN(tags);
