# 00 Baseline & Git Forensics

## Estado Geral do Repositório
* **Branch Atual:** `main`
* **HEAD Commit:** `2c2ba40670aa9af85a65336833f5b9e4e0fb45e6` (fix: corrige tipos task inbox ai-brain)
* **Status do Origin:** Ahead of `origin/main` por 1 commit.

## Working Tree (Arquivos Modificados na Sessão Atual)
* `src/components/tasks/views/KanbanView.tsx` (Corrigido typecast para `client`)
* `src/components/tasks/views/ListView.tsx` (Corrigido typecast para `notes`)
* `src/hooks/tasks/useDailyDigest.ts` (Corrigido asserção não-nula para `agency`)

## Análise Forense de Alterações Anteriores
* **Identificação de Arquivos Apagados:** As visões de tarefas (`TimelineView`, `ListView`, `CalendarView`, `WorkloadView`, `ReportsView`) foram restauradas no checkout anterior após deleção errônea.
* **Módulos Renomeados ou Ocultados:**
  * O sistema de abas no `TaskShell.tsx` que continha visões marcadas como "Em Construção" foi modificado para exibir o Kanban diretamente. As visões foram então reconstruídas como reais.
  * O simulador de seguro nas landing pages públicas e o catálogo de templates foram verificados para garantir que não exibam mocks simulados.

## Integridade do Schema
* Existem **214 migrations** aplicadas no banco de dados.
* A estrutura de tipos TS (`src/integrations/supabase/types.ts`) está desatualizada com relação às tabelas novas de Inbox e Tasks. Adotada estratégia temporária de casting implícito `(supabase as any)` e tipos locais em `task.types.ts` até a regeneração do arquivo de tipos com PAT.
