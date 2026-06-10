-- Fase D: Schema updates para Policies

ALTER TABLE public.policy_documents ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Permitir que super_admins façam UPDATE em policy_documents
DROP POLICY IF EXISTS pd_super_admin_update ON public.policy_documents;
CREATE POLICY pd_super_admin_update ON public.policy_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
