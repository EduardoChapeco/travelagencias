# 22. Master Execution Plan (Plano Mestre de Recuperação)

Este plano mestre define o backlog técnico executável para recuperar, refatorar e estabilizar as capacidades avançadas do Turis.

---

## Backlog Técnico Executável

### ITEM-P0-01: Relações e Chaves Estrangeiras de Tarefas
* **Identificador:** ITEM-P0-01
* **Requisito Original:** A tabela de tarefas (`tasks`) deve se relacionar de forma íntegra e sem vazamentos de RLS com o cadastro de consultores/perfis de agência.
* **Comportamento Esperado:** Usuários do frontend conseguem carregar e atualizar tarefas e ver quem é o responsável através de consultas normais unificadas com `public.profiles`.
* **Comportamento Atual:** A chave estrangeira de `assigned_to` e `created_by` apontava incorretamente para `auth.users`, gerando erros REST de permissão.
* **Evidência:** O typecheck e as queries do Kanban quebravam em runtime se não fossem castadas.
* **Causa Raiz:** A migration original vinculou colunas operacionais a `auth.users`, que é restrito pelo PostgREST padrão da API Supabase.
* **Severidade:** P0 (Integridade de RLS e Banco)
* **Dependências:** Nenhuma.
* **Módulos Afetados:** Kanban de Tarefas, Timeline, Agenda.
* **Arquivos Afetados:** `src/components/tasks/TaskShell.tsx`, `src/routes/agency.$slug.daily-tasks.tsx`.
* **Contratos Afetados:** `public.tasks`.
* **Tabelas e Colunas Afetadas:** `public.tasks(assigned_to, created_by)`.
* **Migration Necessária:** Aplicada localmente (`20260802000000_fix_tasks_foreign_keys.sql`).
* **RLS Necessária:** Saneada para validar por agência associando com `profiles`.
* **Backend Necessário:** Postgres FK ajustada para `public.profiles`.
* **Frontend Necessário:** JOIN do React Query corrigido para puxar dados do profile.
* **Rotas e Navegação:** `/daily-tasks`.
* **Compatibilidade com Legado:** Mantida.
* **Estratégia de Migração:** Direta. A chave estrangeira foi substituída mantendo os dados preservados.
* **Rollback:** Recriar as FKs apontando para `auth.users`.
* **Testes Obrigatórios:** Carregar o Kanban e verificar que o nome do consultor atribuído renderiza sem erros.
* **Critério Objetivo de Conclusão:** O typecheck compila com Exit Code 0 e a lista de tarefas carrega dados reais em runtime.

---

### ITEM-P1-01: Concorrência e Duplicidade de Schemas no Inbox/Omnichannel
* **Identificador:** ITEM-P1-01
* **Requisito Original:** Unicidade de armazenamento para todas as interações de chats multicanais (WhatsApp, E-mail, Instagram, Webchat).
* **Comportamento Esperado:** As mensagens trocadas na Inbox do operador, na IA e na aba de CRM/Leads devem sincronizar na mesma base de dados.
* **Comportamento Atual:** A Inbox em `/inbox` lê/escreve de `conversations` e `messages`. A aba de chat do CRM (`OmnichannelChat.tsx`), o `AIHunterPanel.tsx` e o `ActionExecutor.ts` da IA operam na base antiga `omnichannel_sessions` e `omnichannel_messages`.
* **Evidência:** Mensagens enviadas no CRM não aparecem no chat central da Inbox e vice-versa.
* **Causa Raiz:** Duplicação estrutural de tabelas concorrentes sem estratégia Strangler.
* **Severidade:** P1 (Funcionalidade fragmentada / Perda de dados)
* **Dependências:** ITEM-P0-01.
* **Módulos Afetados:** Inbox, CRM, Assistente de IA, Webhooks.
* **Arquivos Afetados:**
  * `src/components/crm/lead-details/OmnichannelChat.tsx`
  * `src/components/crm/lead-details/AIHunterPanel.tsx`
  * `src/lib/api/ai-chat.functions.ts`
  * `src/lib/ai/ActionExecutor.ts`
* **Contratos Afetados:** Tipos e DTOs de mensagens e sessões de chat.
* **Tabelas e Colunas Afetadas:** `omnichannel_sessions`, `omnichannel_messages`, `conversations`, `messages`, `contacts`.
* **Migration Necessária:** Não aplicável (unificação via código e adapters).
* **RLS Necessária:** Alinhada nas tabelas novas.
* **Backend Necessário:** Ajustar as funções de IA e o ActionExecutor para gravar na tabela canônica `messages` e associar as conversas.
* **Frontend Necessário:** Substituir as referências de tabelas em `OmnichannelChat.tsx` e `AIHunterPanel.tsx` para usar o novo schema.
* **Rotas e Navegação:** `/inbox`, `/crm/$lead_id`.
* **Compatibilidade com Legado:** Manter leitura adaptada para migrar registros antigos.
* **Estratégia de Migração:** Strangler Pattern. Substituir escritas no CRM e IA para a tabela nova e rodar um script de migração local dos dados históricos.
* **Rollback:** Reverter referências de tabelas para `omnichannel_messages`.
* **Testes Obrigatórios:** Enviar mensagem na Inbox e verificar que ela renderiza na aba de CRM correspondente.
* **Critério Objetivo de Conclusão:** Sincronização em tempo real de mensagens entre Inbox, CRM e IA comprovada.

---

### ITEM-P2-01: Purga de `as any` e Validação Estrita de Tipos no Inbox
* **Identificador:** ITEM-P2-01
* **Requisito Original:** Tipagem estrita e ausência de casts indevidos que ocultam bugs e desalinhamentos de dados.
* **Comportamento Esperado:** Consultas do Supabase são declaradas de forma fortemente tipada sem o bypass `supabase as any`.
* **Comportamento Atual:** Múltiplas ocorrências de `as any` no arquivo `inbox.tsx` para mapear `crm_leads`, `contacts` e `conversations` devido à defasagem no schema local.
* **Evidência:** Presença de mais de 20 ocorrências de `as any` em `agency.$slug.inbox.tsx`.
* **Causa Raiz:** O arquivo de tipos estáticos `types.ts` não possui o schema atualizado do Supabase.
* **Severidade:** P2 (Qualidade de código / Contratos)
* **Dependências:** ITEM-P1-01.
* **Módulos Afetados:** Inbox, CRM, Tipagem.
* **Arquivos Afetados:** `src/routes/agency.$slug.inbox.tsx`.
* **Contratos Afetados:** `src/integrations/supabase/types.ts`.
* **Tabelas e Colunas Afetadas:** Todas.
* **Migration Necessária:** Nenhuma.
* **RLS Necessária:** Nenhuma.
* **Backend Necessário:** Atualizar as definições de tipos locais via cli do Supabase.
* **Frontend Necessário:** Remover os casts `as any` e declarar propriedades tipadas corretas.
* **Rotas e Navegação:** `/inbox`.
* **Compatibilidade com Legado:** Integral.
* **Estratégia de Migração:** Direta.
* **Rollback:** Recolocar os casts `as any`.
* **Testes Obrigatórios:** `npm run typecheck` bem-sucedido com código tipado de forma estrita.
* **Critério Objetivo de Conclusão:** Remoção total de `as any` em `inbox.tsx` atestada.
