# DIÁRIO DE ALTERAÇÕES
## Instrução: Adicionar uma linha por arquivo alterado. NUNCA apagar linhas.

| Data | Sessão | Fase | Módulo | Tipo | Arquivo | O que mudou | Finding resolvido |
|------|--------|------|--------|------|---------|-------------|-------------------|
| 2026-06-29 | S00 | 0.0 | Plataforma | INIT | N/A | Inventário Master criado | N/A |
| 2026-06-29 | S01 | 1.0 | Financeiro | DB | `20260812000000_financial_remediation_fixes.sql` | Criada migration com RLS, chaves em `cash_transactions` e correção de triggers | F001, F002, F004, F005 |
| 2026-06-29 | S01 | 1.0 | Financeiro | SRC | `src/services/trips.ts` | markInstallmentPaid agora cria transação de caixa ao dar baixa em parcelas | F003 |
| 2026-06-29 | S01 | 1.0 | Financeiro | SRC | `reconciliation.tsx` | Adicionado trip_id/installment_id no insert e tratamento de erro de query | F002, F006 |
| 2026-06-29 | S01 | 1.0 | Financeiro | SRC | `cash.tsx` | Adicionados alertas de erro nas queries de caixas, sessões e transações | F007 |
| 2026-06-29 | S01 | 1.0 | Financeiro | SRC | `ledger.tsx` | Adicionado tratamento de erro na tabela e botões padrão do Design System | F007, F008 |
| 2026-06-29 | S01 | 1.0 | Financeiro | SRC | `types.ts` | Removidas declarações duplicadas e unificados campos de Tabelas no Supabase | N/A (Compile Fix) |
| 2026-06-29 | S01 | 1.0 | Integração | SRC | `agency.$slug.integrations.tsx` | Corrigido uso do helper useConfirm na remoção de operadora (onConfirm callback) | N/A (Compile Fix) |
| 2026-06-29 | S01 | 1.0 | Portal Clientes | SRC | `client.trips.$id.tsx` | Corrigido type errors de strict null check com fallback em client_id | N/A (Compile Fix) |
| 2026-06-29 | S02 | 2.0 | Grupos | DB | `20260813000000_group_tours_remediation_fixes.sql` | Atualiza RPC approve_group_enrollment para criar lançamento em cash_transactions | F011 |
| 2026-06-29 | S02 | 2.0 | Grupos | SRC | `agency.$slug.group-tours.$id.lazy.tsx` | Adiciona cancelEnrollment, botões Rejeitar/Cancelar, popup swap de assentos | F012, F013 |
| 2026-06-29 | S02 | 2.0 | Grupos | SRC | `agency.$slug.financial.groups.tsx` | Adiciona tratamentos de erro nas queries e GhostButton na paginação | F014, F017 |
| 2026-06-29 | S02 | 2.0 | Grupos | SRC | `agency.$slug.group-tours.index.tsx` | Adiciona tratamento de erro na query principal com AlertCircle | F015 |
| 2026-06-29 | S03 | 3.0 | Cotações | DB | `20260814000000_proposals_remediation_fixes.sql` | Redefine convert_proposal_to_trip para criar plano de pagamento e parcelas | F021 |
| 2026-06-29 | S03 | 3.0 | Cotações | SRC | `agency.$slug.proposals.index.tsx` | Adiciona banner de erro na listagem de propostas com AlertCircle | F022 |
| 2026-06-29 | S03 | 3.0 | Cotações | SRC | `agency.$slug.proposals.$id.tsx` | Adiciona banner de erro no editor de propostas com AlertCircle | F022 |
| 2026-06-29 | S03 | 3.0 | Cotações | SRC | `m.proposal.$token.tsx` | Adiciona tela de erro no portal de proposta do cliente se falhar | F022 |
| 2026-06-29 | S03 | 3.0 | Cotações | SRC | `agency.$slug.quotes.index.tsx` | Adiciona tratamento de erro nas abas do workspace de cotações | F022 |
| 2026-06-29 | S03 | 3.0 | Cotações | SRC | `agency.$slug.quotes.$id.tsx` | Adiciona banners de erro nas seções do painel de decisão da cotação | F022 |
| 2026-06-29 | R4 | 4.0 | Trips | SRC | `agency.$slug.trips.index.tsx` | Adiciona banner de erro AlertCircle quando listagem de viagens falha | F031 |
| 2026-06-29 | R4 | 4.0 | Trips | SRC | `agency.$slug.trips.$id.tsx` | Adiciona tela de erro quando tripQ.isError no layout da viagem | F032 |
| 2026-06-29 | R4 | 4.0 | Trips | SRC | `agency.$slug.trips.$id.financial.tsx` | Adiciona banner de erro unificado para recordsQ e planQ | F033 |
| 2026-06-29 | R4 | 4.0 | Trips | SRC | `agency.$slug.trips.$id.passengers.tsx` | Adiciona banner de erro para list/tripQ/docsQ | F034 |
| 2026-06-29 | R4 | 4.0 | Trips | SRC | `agency.$slug.trips.$id.contract.tsx` | Adiciona tela de erro para tripQ e contractQ | F035 |
| 2026-06-29 | R4 | 4.0 | Trips | SRC | `src/services/trips.ts` | Guard !inst.is_third_party antes de inserir em cash_transactions | F036 |
| 2026-06-29 | R4 | 4.0 | Financeiro | SRC | `agency.$slug.financial.operators.tsx` (NOVO) | Criada nova aba Faturamento Operadoras com KPIs e tabelas de lancamentos/parcelas externas | F037 |
| 2026-06-29 | R4 | 4.0 | Financeiro | SRC | `agency.$slug.financial.tsx` | Adicionada aba Faturamento Operadoras na navegacao financeira | F037 |
| 2026-06-29 | R4 | 4.0 | Router | SRC | `routeTree.gen.ts` | Registrada rota /financial/operators em todos os 9 pontos do routeTree | F037 |
| 2026-06-29 | R5 | 5.0 | CRM | SRC | `agency.$slug.crm.$lead_id.lazy.tsx` | Substitui retorno null silencioso por tela de erro completa com botao Voltar ao CRM | F041 |
| 2026-06-29 | R5 | 5.0 | Contratos | SRC | `agency.$slug.contracts.tsx` | Adiciona AlertCircle + banner de erro na listagem de contratos | F042 |
| 2026-06-29 | R5 | 5.0 | Inbox | SRC | `agency.$slug.inbox.tsx` | Adiciona AlertCircle + isError nas queries de channels e conversations + banner fixo de erro | F043 |
| 2026-06-29 | R6 | 6.0 | Fornecedores | SRC | `agency.$slug.suppliers.index.tsx` | Adicionado AlertCircle e banner de erro quando a query de fornecedores falha | F051 |
| 2026-06-29 | R6 | 6.0 | Suporte | SRC | `agency.$slug.support.tsx` | Adicionado AlertCircle e banner de erro no topo se ticketsQ falhar | F052 |
| 2026-06-29 | R6 | 6.0 | Vouchers | SRC | `agency.$slug.vouchers.tsx` | Adicionados banners de erro em ambas as abas (vouchers e voos) se as queries falharem | F053 |
| 2026-06-29 | R6 | 6.0 | Vistos | SRC | `agency.$slug.visas.tsx` | Adicionado banner de erro acima do kanban se stagesQ ou visasQ falharem | F054 |
| 2026-06-29 | R6 | 6.0 | Agenda | SRC | `agency.$slug.calendar.tsx` | Adicionado banner de erro acima do grid de calendário se as queries falharem | F055 |
| 2026-06-29 | R6 | 6.0 | Equipe | SRC | `agency.$slug.team.tsx` | Adicionado banner de erro acima das tabelas de equipe se queries falharem | F056 |
| 2026-06-29 | R6 | 6.0 | Quartos | SRC | `agency.$slug.rooming-list.tsx` | Adicionados banners de erro e loaders no dashboard e nos painéis de quartos/passageiros | F057 |
| 2026-06-29 | R6 | 6.0 | Portal | SRC | `portal.settings.tsx` | Adicionado banner de erro se as configurações do portal falharem ao carregar | F058 |
| 2026-06-29 | R6 | 6.0 | Portal | SRC | `portal.pages.index.tsx` | Adicionado banner de erro se a query de páginas ou analytics falhar | F059 |
| 2026-06-29 | R6 | 6.0 | Portal | SRC | `portal.pages.$page_id.tsx` | Adicionada tela de erro com botão de voltar se a query da página selecionada falhar | F060 |
| 2026-06-29 | R6 | 6.0 | Portal | SRC | `portal.blog.tsx` | Adicionado banner de erro se a query de posts do blog falhar | F061 |
| 2026-06-29 | R7 | 7.0 | Chatbot | SRC | `BotCanvas.tsx` | Criada a tabela chatbot_flows no Supabase e integrada no front com useQuery/useMutation | F062 |
| 2026-06-29 | R7 | 7.0 | Daily Digest | SRC | `useDailyDigest.ts` | Integrado o primeiro nome do usuário ativo na saudação dinâmica do digest | F063 |
| 2026-06-29 | R8 | 8.0 | Admin Portal | SRC | `admin.*.tsx` | Tratamento de erros assíncronos em todas as 10 páginas de gerenciamento do super-administrador global | R8.1-10 |

