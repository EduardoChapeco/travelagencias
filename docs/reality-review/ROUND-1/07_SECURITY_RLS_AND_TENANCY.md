# Segurança, RLS e Multi-tenancy (TravelOS)

Este relatório audita o isolamento de dados entre diferentes agências (tenants), a robustez das políticas de Row Level Security (RLS) no Supabase e a vulnerabilidade de permissões em relação à imutabilidade financeira.

---

## 1. Isolamento Multi-tenant (Tenancy)
O isolamento por agência é implementado no nível de banco de dados por meio da verificação da chave `agency_id`.
* **Membros da Agência**: A função de banco `public.is_agency_member(auth.uid(), agency_id)` valida se o usuário autenticado possui registro ativo na tabela de associação `user_roles`.
* **Controle de Parâmetros**: O Supabase impede vazamento de dados síncronos se a RLS estiver habilitada. Todas as tabelas financeiras novas e legadas possuem o mecanismo ativado (`ALTER TABLE ENABLE ROW LEVEL SECURITY`).

---

## 2. Vulnerabilidades de RLS e Compliance Identificadas

> [!CAUTION]
> Identificamos duas brechas graves de segurança física e lógica na migração do Ledger Contábil:
>
> 1. **Permissão de Exclusão (DELETE) no Livro-Razão**:
>    * **Vulnerabilidade**: A política de RLS criada em [20260716000000_financial_rearchitecture_core.sql](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260716000000_financial_rearchitecture_core.sql#L90-L91) define:
>      `CREATE POLICY "ledger_entries_access" ON public.financial_ledger_entries FOR ALL USING (public.is_agency_member(auth.uid(), agency_id));`
>    * **Risco**: Ao usar `FOR ALL`, o banco permite operações de `DELETE` e `UPDATE` para qualquer membro comum da agência sobre a tabela `financial_ledger_entries`. Isso destrói a premissa de imutabilidade ("Razão Contábil Append-only") exigida na Seção 4.1 do PRD.
>    * **Ação Corretiva**: Substituir a política para conceder apenas `SELECT` para membros gerais, delegando escritas (`INSERT`) unicamente a funções internas de servidor autorizadas ou ao `service_role`, bloqueando `DELETE` e `UPDATE` para qualquer papel da agência.
>
> 2. **DELETE irrestrito em Ajustes de Vendedores**:
>    * **Vulnerabilidade**: A tabela `seller_adjustments` permite exclusão física de registros por membros comuns da agência. Um vendedor mal-intencionado poderia, teoricamente, excluir um registro de desconto operacional (`error_charge`) antes do fechamento do mês para inflar sua comissão.
>    * **Ação Corretiva**: Bloquear a política de exclusão física para membros comuns, liberando exclusões apenas para o gestor com geração obrigatória de trilha de auditoria.
