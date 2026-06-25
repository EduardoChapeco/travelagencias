# 14. Modelagem de Banco de Dados e Políticas RLS

Este documento detalha o planejamento físico de banco de dados, contendo as instruções SQL necessárias para estruturar as tabelas da integração **Infotravel/Infotera** e as políticas de **Row Level Security (RLS)** para garantir o isolamento absoluto de multi-tenant.

---

## 1. Estrutura Física das Novas Tabelas

Abaixo está o script SQL completo da migração que será criada nas fases de implementação para habilitar o suporte às filas de sincronização, identidades externas e logs:

```sql
-- Habilitar RLS em todas as tabelas criadas na migração
ALTER TABLE public.external_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Políticas de Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1. Políticas para external_entity_links (Restrito a membros da agência)
CREATE POLICY "agency_members_select_entity_links" ON public.external_entity_links
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency_admins_manage_entity_links" ON public.external_entity_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'agency_admin'::public.app_role, agency_id));

-- 2.2. Políticas para sync_inbox (Apenas leitura para administradores)
CREATE POLICY "agency_admins_select_sync_inbox" ON public.sync_inbox
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'agency_admin'::public.app_role, agency_id)
  );

-- 2.3. Políticas para sync_outbox
CREATE POLICY "agency_members_select_sync_outbox" ON public.sync_outbox
  FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

CREATE POLICY "agency_members_insert_sync_outbox" ON public.sync_outbox
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id));

-- 2.4. Políticas para sync_conflicts (Somente gestores/admins resolvem conflitos)
CREATE POLICY "agency_managers_manage_conflicts" ON public.sync_conflicts
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'agency_admin'::public.app_role, agency_id)
    OR public.has_role(auth.uid(), 'agency_manager'::public.app_role, agency_id)
  );
```

---

## 2. Triggers de Validação e Integridade Relacional

Para evitar que erros de exclusão física em cascata quebrem o dicionário de links externos, propõe-se uma trigger de proteção de deleção:

```sql
CREATE OR REPLACE FUNCTION public.protect_external_links_on_delete()
RETURNS trigger AS $$
BEGIN
  -- Se o objeto interno foi deletado, arquiva o link ou altera o status para 'orphaned'
  -- em vez de deixar chave estrangeira apontando para o vazio ou estourar erro de FK.
  UPDATE public.external_entity_links
  SET status = 'orphaned', last_synced_at = now()
  WHERE internal_entity_type = TG_TABLE_NAME AND internal_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Exemplo: Associar trigger à tabela de viagens (trips)
DROP TRIGGER IF EXISTS protect_trips_links_trg ON public.trips;
CREATE TRIGGER protect_trips_links_trg
  BEFORE DELETE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.protect_external_links_on_delete();
```

---

## 3. Diretrizes de Segurança Contábil

A tabela de auditoria `sync_attempts` e a fila de entrada `sync_inbox` só podem ser lidas por administradores ou pelo papel interno de sistema (`service_role`). Isso impede que operadores comuns acessem payloads contendo margens brutas da agência, valores de comissão acordados com a Infotravel ou logs de handshake financeiro de faturamento da empresa.
