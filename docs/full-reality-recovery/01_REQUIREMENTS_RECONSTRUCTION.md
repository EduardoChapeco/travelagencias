# 01 Reconstrução dos Requisitos

Neste documento, consolidamos todos os requisitos explícitos solicitados para a plataforma Turis/TravelAgências, extraídos do histórico e das especificações.

---

## 1. Módulo Inbox Omnichannel (Novo)
* **Origem:** Prompt Mestre - Recriando Umbler Talk/Mail
* **Domínio:** Mensageria / Suporte
* **Problema:** Unificação dos canais de comunicação com leads e clientes (WhatsApp, E-mail, Webchat) em uma única interface em tempo real.
* **Comportamento Esperado:**
  * Visualização de sessões/conversações ativas divididas por canal.
  * Envio e recebimento de mensagens em tempo real com conexões via webhook.
  * Integração com IA (Gemini/OpenAI) para resposta assistida ou automática.
  * Atribuição de conversas a agentes da organização.
* **Tabelas de Dados:** `conversations`, `messages`, `channels`, `contacts`, `feature_flags`.
* **Regras de Negócio:**
  * Uma conversa deve pertencer a um canal e a um contato específico.
  * RLS garante isolamento rigoroso por `agency_id`.

## 2. Módulo de Gestão de Tarefas (Task Management V2)
* **Origem:** Requisito de Produtividade & Kanban Diário
* **Domínio:** Produtividade / CRM
* **Problema:** Organização diária de tarefas de forma livre, tirando a barreira de abas excessivas.
* **Comportamento Esperado:**
  * Rota principal `/daily-tasks` carregando diretamente o Kanban (`MyDayView`).
  * Múltiplas visões alternativas (`ListView`, `CalendarView`, `TimelineView`, `WorkloadView`, `ReportsView`) alimentadas por queries Supabase com dados reais.
  * Registro de log de tempo (`task_time_logs`), subtasks e checklists.
  * Relatórios agregados de desempenho e produtividade baseados em scores calculados via RPC/IA.
* **Tabelas de Dados:** `tasks`, `task_checklist_items`, `task_time_entries`, `task_comments`, `task_dependencies`, `task_labels`, `task_watchers`, `task_activity_log`, `user_task_preferences`, `agent_productivity_scores`.

## 3. Painel Fornecedores B2B & Inteligência
* **Origem:** Auditoria de Fornecedores e Remoção de Mocks
* **Domínio:** Compras / Parcerias
* **Problema:** Análise do histórico de vendas e reputação de fornecedores.
* **Comportamento Esperado:**
  * Exibição de estatísticas reais de uso por parceiro (calculadas em tempo real em `proposal_items`).
  * Contagem exata de produtos cadastrados por fornecedor (`supplier_products`).
  * Média real de avaliações dos agentes (`supplier_reviews`).
  * Upload de contratos e documentos de SLA.
* **Tabelas de Dados:** `suppliers`, `supplier_products`, `supplier_reviews`, `supplier_contacts`, `supplier_documents`.
