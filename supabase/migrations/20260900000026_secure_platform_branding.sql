-- =========================================================================================
-- Microfase 9: Correção de RLS em platform_branding
-- A política "Enable full access for admins" usava USING(true), permitindo que qualquer
-- usuário autenticado — inclusive clientes comuns — modificasse a identidade visual 
-- da plataforma (nome, logo, email). Corrigido para exigir role de super_admin.
-- =========================================================================================

DROP POLICY IF EXISTS "Enable full access for admins" ON platform_branding;

-- Somente super_admins podem escrever na identidade visual da plataforma
CREATE POLICY "platform_branding_super_admin_write" ON platform_branding
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin', NULL))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin', NULL));
