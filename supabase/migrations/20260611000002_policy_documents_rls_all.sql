-- Migration: Correção de RLS policy_documents para permitir escrita completa (ALL) pelo Super Admin
-- Objetivo: Permitir que o Super Admin atualize, crie e delete documentos sob a tabela policy_documents.

DROP POLICY IF EXISTS pd_super_admin_write ON public.policy_documents;

CREATE POLICY pd_super_admin_write ON public.policy_documents 
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
