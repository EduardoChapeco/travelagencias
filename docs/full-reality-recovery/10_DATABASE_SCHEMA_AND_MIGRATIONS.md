# 10 Esquema de Banco de Dados e Migrations

Neste documento consolidamos os scripts SQL das tabelas adicionadas nas últimas migrations relevantes que definiram a arquitetura do Inbox Omnichannel e da Gestão de Tarefas.

---

## 1. Módulo Inbox Omnichannel
* **Migration:** `20260801000003_umbler_inbox_foundation.sql`
* **Entidades Criadas:**
  * `feature_flags` (Key-value para ativação gradual de recursos)
  * `channels` (Configuração de canais - WhatsApp, Email, Webchat)
  * `contacts` (Cadastro de contatos associados aos canais)
  * `conversations` (Sessões de conversa ativas, com RLS por `agency_id`)
  * `messages` (Histórico de mensagens inbound/outbound)

---

## 2. Módulo Gestão de Tarefas (V2)
* **Migration:** `20260628170100_task_management_v2.sql`
* **Entidades Criadas:**
  * `tasks` (Tabela núcleo contendo status, prioridade, prazos e metadados de IA)
  * `task_spaces` e `task_projects` (Estruturação de workspaces)
  * `task_checklist_items` (Sub-itens operacionais)
  * `task_time_entries` (Logs de tempos gastos)
  * `task_comments` (Thread de discussões da tarefa)
  * `task_dependencies` (Relacionamentos bloqueadores/duplicados)
  * `task_labels` e `task_label_assignments` (Etiquetagem customizável)
  * `task_watchers` (Acompanhamento por múltiplos agentes)
  * `task_activity_log` (Histórico forense de modificações)
  * `user_task_preferences` (Persistência da visualização preferida - Kanban, Lista, etc.)
  * `agent_productivity_scores` (Cálculo periódico de performance do agente)
