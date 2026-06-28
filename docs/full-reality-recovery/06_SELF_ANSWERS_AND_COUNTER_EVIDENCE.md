# 06 Respostas e Contestações Técnicas

## 1. Respostas — Fluxo de Gestão de Tarefas
* **Q1.1 (resolved_at ao concluir):**
  * **Comportamento Esperado:** Persistir a data e hora do encerramento da tarefa.
  * **Resposta Encontrada:** O `moveTaskMutation` em `useTaskMutations.ts` apenas atualiza `status` e `position`. No entanto, na migration SQL `20260628170100_task_management_v2.sql`, existe uma trigger a nível de banco que intercepta a transição do status para `done` e atualiza automaticamente `resolved_at` para `NOW()`.
  * **Evidência:** Migration `20260628170100` linha 285+ (trigger Postgres).
  * **Classificação:** REAL PONTA A PONTA.

* **Q1.2 (Bloqueio de dependências):**
  * **Comportamento Esperado:** Alertas visuais e bloqueios caso tarefas bloqueadoras estejam abertas.
  * **Resposta Encontrada:** A UI não bloqueia o movimento de tarefas no Kanban por dependências. A verificação existe apenas conceitualmente na estrutura de banco (`task_dependencies`).
  * **Correção Necessária:** Implementar na mutation de movimentação de tarefas a validação de bloqueio se houver dependências do tipo `blocks` não resolvidas.
  * **Classificação:** PARCIAL (Apenas UI e Banco, falta regra ativa no front/back).

## 2. Respostas — Caixa de Entrada (Inbox)
* **Q2.1 (WhatsApp Webhook Schema):**
  * **Comportamento Esperado:** Conexão direta com a tabela do novo Inbox (`messages`).
  * **Resposta Encontrada:** O webhook do WhatsApp em `supabase/functions/whatsapp-webhook` grava na tabela antiga `omnichannel_messages`.
  * **Contestação:** O Inbox novo lê de `messages`. As mensagens recebidas do webhook não aparecem no Inbox novo.
  * **Causa Raiz:** O módulo Inbox foi criado em uma migration recente (`20260801000003`) mas o webhook legado não foi atualizado.
  * **Correção Necessária:** Atualizar a Edge Function `whatsapp-webhook` para gravar no novo schema (`messages`, `conversations`).
  * **Classificação:** ÓRFÃO / DIVERGENTE DE PRODUÇÃO (Conectado à tabela errada).
