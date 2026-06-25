# 05. Migrations de Banco de Dados e Políticas RLS

Este documento apresenta uma auditoria detalhada sobre o histórico de migrations de banco de dados aplicadas e a segurança de Row Level Security (RLS) das tabelas remotas.

## 1. Incidente da Migration 20260628000000

Durante o processo de reestruturação financeira e de custos na migration `20260628000000_cash_registers_and_group_costs.sql`, foram identificadas falhas operacionais graves na definição de políticas de RLS.

### Análise da Falha

1. **Definição de Políticas com Tabela Inexistente:** O arquivo original declarava políticas de RLS para as tabelas `cash_registers`, `cash_sessions`, `cash_transactions` e `group_tour_costs` utilizando a seguinte subconsulta de validação de tenant:
   ```sql
   SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
   ```
2. **Causa do Sucesso na Migração:** No PostgreSQL, o comando `CREATE POLICY` não valida a existência física das tabelas referenciadas nas subconsultas ou cláusulas `USING`/`WITH CHECK` no momento da criação da política. A migration foi executada e marcada como aplicada com sucesso no Supabase remoto sem acusar erros.
3. **Falha em Tempo de Execução:** Logo após o deploy, qualquer tentativa da aplicação de ler ou gravar dados nas tabelas financeiras ou de custos gerava um erro de banco de dados (`relation "public.agency_users" does not exist`), inutilizando essas funcionalidades em produção.
4. **Resolução Incorreta (Risco de Checksum):** O arquivo de migração local `20260628000000_cash_registers_and_group_costs.sql` foi editado diretamente para substituir as 7 ocorrências de `agency_users` pela tabela correta `user_roles`.
   - _Aviso Crítico:_ Alterar o conteúdo de um arquivo de migração já aplicado e registrado na tabela `supabase_migrations.schema_migrations` remoto quebra a integridade histórica de checksum do repositório. Em ambientes integrados de CI/CD, isso causaria a rejeição do banco de dados em deploys futuros por checksum mismatch, exigindo um reset manual da base ou reparo manual de registros de migration.

## 2. Auditoria Geral de Políticas RLS em Tabelas Críticas

Ao analisar a lista completa de políticas RLS em produção, identificamos comportamentos inadequados nos seguintes módulos:

### Tabela `contracts` (Contratos)

- **Políticas Ativas:**
  - `contracts strict update`: Permite que qualquer membro da agência atualize o contrato.
- _Falha:_ Não há validação impedindo a alteração caso o contrato já possua `status = 'signed'` ou similar. A imutabilidade do documento jurídico assinado não é garantida pelo banco de dados.

### Tabela `user_roles` (Papéis de Usuários)

- **Políticas Ativas:**
  - `User roles updatable by agency admins`: `qual: can_manage_agency_finances(agency_id)`
- _Falha:_ O banco de dados permite que qualquer usuário com a permissão `can_manage_agency_finances` atualize papéis de usuários (`user_roles`). Isso significa que um gerente financeiro da agência pode alterar o próprio papel ou o papel de terceiros para `agency_admin` ou `super_admin`, caracterizando uma escalação de privilégios.

### Tabela `buckets` (Storage)

- **Buckets Públicos:** `payment-receipts`, `voucher-pdfs`, `trip-memories`, `agency-media`.
- _Falha:_ O Supabase Storage serve arquivos de buckets públicos ignorando as políticas RLS de leitura. Qualquer pessoa com o link de um arquivo hospedado nestes buckets (incluindo vouchers confidenciais e comprovantes de pagamentos) consegue baixá-los diretamente pela CDN pública.
