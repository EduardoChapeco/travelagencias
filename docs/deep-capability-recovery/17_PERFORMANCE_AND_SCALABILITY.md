# 17. Performance and Scalability (Desempenho e Escalabilidade)

Este relatório apresenta a análise de performance, indexação física do banco de dados e controle de chamadas de rede (rate limit).

---

## 1. Otimização de Consultas e Índices de Banco

Auditoria e criação de índices físicos efetuados para acelerar a renderização da interface e evitar waterfalls de dados no frontend:
* **Índices de CRM e Leads:**
  * Criado o índice `idx_leads_agency_stage` na tabela `crm_leads(agency_id, stage_id)` para aceleração do render das raias do funil de vendas.
* **Índices de Inbox e Mensagens:**
  * Criado o índice `idx_messages_conversation_date` na tabela `messages(conversation_id, created_at)` para que o histórico de conversas ativas carregue instantaneamente sem fazer scan total na tabela de mensagens de produção.
  * Criado o índice `idx_conversations_agency_status` na tabela `conversations(agency_id, status, last_message_at desc)`.

---

## 2. Paginação e Proteção de Rate Limits

* **Paginação de Consultas:** Listagens longas (CRM, Contatos e Financeiro) implementam paginação nativa (`range(from, to)`) no PostgREST do Supabase, limitando o payload trafegado na rede para no máximo 50 registros por requisição.
* **Rate Limits na IA e WhatsApp:**
  * A procedure de rate-limit `checkAndIncrementRateLimit` barra requisições excessivas de geração de texto de IA por agência nas últimas 24 horas, protegendo o orçamento e a escalabilidade da API contra loops infinitos de envio.
