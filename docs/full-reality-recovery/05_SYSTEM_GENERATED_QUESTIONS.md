# 05 Perguntas Geradas pelo Sistema

## 1. Fluxo de Gestão de Tarefas
* **Q1.1:** Ao mover uma tarefa no Kanban para "Done", a data `resolved_at` é persistida no Supabase?
* **Q1.2:** Se uma tarefa tem dependências bloqueadoras pendentes, a UI bloqueia a alteração de status para "Done" ou exibe alerta?
* **Q1.3:** Ao deletar uma tarefa (Soft Delete), os checklists e log de tempo associados são mantidos ou marcados como inativos?

## 2. Fluxo de Caixa de Entrada (Inbox)
* **Q2.1:** A sincronização via webhook do WhatsApp grava diretamente no novo schema (`messages`) ou no antigo (`omnichannel_messages`)?
* **Q2.2:** O que acontece se o token de acesso do WhatsApp Cloud API expirar? A UI notifica o gestor sobre a falha de conexão do canal?
* **Q2.3:** A atribuição de uma conversa para um agente notifica-o via push ou sinaliza na UI em tempo real?

## 3. Fluxo de Fornecedores B2B
* **Q3.1:** As métricas de volume de vendas de fornecedores estão considerando todas as propostas criadas ou apenas propostas com status "Aprovado" ou "Convertido"?
* **Q3.2:** Se um parceiro é desativado (`is_active = false`), a UI oculta-o na busca de catálogo de novas propostas?
