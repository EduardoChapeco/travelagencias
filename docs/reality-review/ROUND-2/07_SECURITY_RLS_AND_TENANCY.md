# Segurança, RLS e Multi-tenancy — Rodada 2 (TravelOS)

Este relatório audita a segurança lógica, isolamento de inquilinos (multi-tenancy) e permissões de manipulação física de tabelas contábeis e de comissões no Supabase.

---

## 1. Isolamento de Inquilinos (Multi-tenant)
Todas as novas tabelas introduzidas na rearquitetura financeira possuem RLS habilitada (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). O isolamento lógico entre agências concorrentes é mantido por meio do predicado:
`USING (public.is_agency_member(auth.uid(), agency_id))`

---

## 2. Alertas Críticos de Segurança e Compliance (P0)

> [!CAUTION]
> **Vulnerabilidade de Integridade e Imutabilidade Contábil (P0)**
> * **Localização**: Migração [20260716000000_financial_rearchitecture_core.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260716000000_financial_rearchitecture_core.sql#L130-L131)
> * **Código**: `CREATE POLICY "ledger_entries_access" ON public.financial_ledger_entries FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));`
> * **Problema**: O uso de `FOR ALL` sem restrições permite que qualquer operador comum da agência autenticada execute operações de `UPDATE` e `DELETE` sobre a tabela contábil `financial_ledger_entries`. Isso viola diretamente a imutabilidade do Livro-Razão Contábil (Razão Append-only), permitindo que lançamentos contábeis históricos sejam alterados ou deletados fisicamente por usuários comuns.
> * **Risco**: Risco severo de fraude financeira, perdas de histórico de transações e não-conformidade com regulação contábil.
> * **Correção Necessária**: Alterar a política de RLS para liberar apenas `SELECT` (leitura) para membros autenticados, restringindo escritas (`INSERT`) apenas a triggers de banco de dados definidoras de segurança (`SECURITY DEFINER`) ou ao papel de `service_role`. Operações de `UPDATE` e `DELETE` devem ser bloqueadas completamente.

---

## 3. Vulnerabilidade de Fraude em Ajustes de Comissões (P0)

> [!CAUTION]
> **Vulnerabilidade de Fraude Operacional (P0)**
> * **Localização**: Migração [20260716000000_financial_rearchitecture_core.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260716000000_financial_rearchitecture_core.sql#L122-L123)
> * **Código**: `CREATE POLICY "adjustments_access" ON public.seller_adjustments FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));`
> * **Problema**: A política concede permissão de `DELETE` e `UPDATE` a qualquer membro da agência na tabela de ajustes (`seller_adjustments`). Isso permite que um vendedor apague ou reduza fisicamente lançamentos de descontos por erro (`error_charge`) cadastrados contra sua conta antes do fechamento do mês contábil.
> * **Risco**: Risco de fraude operacional e infalsificabilidade de dados de faturamento.
> * **Correção Necessária**: Restringir permissões de `INSERT`, `UPDATE` e `DELETE` em `seller_adjustments` apenas a usuários com privilégios de `agency_admin` (gestor) ou `super_admin`. Vendedores normais devem possuir apenas direito de leitura (`SELECT`) sobre os seus próprios ajustes.
