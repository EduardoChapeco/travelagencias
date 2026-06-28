# 04 Especificação Conceitual dos Módulos

## 1. Módulo de Gestão de Tarefas (Productivity OS)
* **Finalidade:** Gestão operacional das atividades diárias dos agentes.
* **Problema Resolvido:** Centralizar tarefas avulsas e geradas automaticamente por embarques ou chamados de suporte.
* **Ações:** Criar, editar, mover de coluna (Kanban), logar tempo (`task_time_entries`), marcar itens de checklist, adicionar dependências e subtasks.
* **Regras de Negócio:**
  * Uma tarefa só pode pertencer a um tenant (`agency_id`).
  * Conclusão de itens de checklist recalcula o progresso percentual da tarefa mãe.
  * O log de tempo acumula em minutos reais.

## 2. Caixa de Entrada Omnichannel (Inbox)
* **Finalidade:** Central de atendimento em tempo real.
* **Problema Resolvido:** Fragmentação de canais de contato (WhatsApp, E-mail, Webchat).
* **Ações:** Responder mensagens, atribuir conversas a membros da equipe, alterar status da sessão, ativar auto-responder IA.
* **Regras de Negócio:**
  * Nova mensagem recebida abre automaticamente a sessão se estiver fechada.
  * Mensagens outbound enviadas atualizam o status para `queued`, depois `sent` pelo webhook do gateway correspondente.

## 3. Inteligência de Fornecedores B2B
* **Finalidade:** Monitoramento e curadoria de parceiros e operadoras de viagens.
* **Problema Resolvido:** Falta de inteligência histórica sobre o desempenho de cada fornecedor nas vendas.
* **Ações:** Cadastrar parceiros, registrar produtos B2B, submeter avaliações internas de agentes, monitorar volume de vendas.
* **Regras de Negócio:**
  * O volume de uso é derivado da contagem de propostas ativas (`proposal_items`) com aquele fornecedor.
  * A média de avaliações é agregada em tempo real a partir do `supplier_reviews`.
