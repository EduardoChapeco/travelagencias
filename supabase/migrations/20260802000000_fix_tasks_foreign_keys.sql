-- Alteração de chaves estrangeiras da tabela tasks para apontar para public.profiles
-- Isso permite que o PostgREST execute queries de JOIN (assignee, creator) com a tabela pública profiles
-- sem estourar erros de permissão de acesso à tabela privada auth.users do Supabase.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
