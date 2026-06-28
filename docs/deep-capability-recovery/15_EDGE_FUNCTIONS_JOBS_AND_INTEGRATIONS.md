# 15. Edge Functions, Jobs and Integrations (Processamento Assíncrono e Webhooks)

Este relatório apresenta a auditoria das Edge Functions implantadas no Supabase e a resiliência de processamentos de longa duração.

---

## 1. Inventário de Edge Functions Críticas

* **`ai-message-processor`:**
  * **Objetivo:** Processa mensagens do chat do WhatsApp/Inbox corporativo em background. Roda o RAG de afinidade, categoriza intenções de compra e gera propostas ligadas ao lead.
* **`whatsapp-webhook` e `whatsapp-sender`:**
  * **Objetivo:** Edge Functions responsáveis pelo recebimento de webhooks Meta e envio de mensagens WhatsApp. Gravam os payloads atômicos diretamente no schema `conversations` e `messages`.
* **`ocr-boleto`:**
  * **Objetivo:** Extrai código de barras, data de vencimento e valores de faturas anexadas no financeiro.

---

## 2. Resiliência e Processamento Durável (Jobs)

* **Segurança do Runtime:**
  * Processamentos assíncronos pesados (como o RAG e análise OCR) não confiam na duração da chamada HTTP (que pode sofrer timeout do Cloudflare ou navegador).
  * **Persistência de Jobs:** O status da operação é gravado no banco de dados (ex: `infotravel_sync_jobs` ou status do lead). A Edge Function atualiza as colunas de progresso (`pending`, `completed`, `failed`) em tempo real. Em caso de falha silenciosa ou encerramento abrupto do container, a operação é reprocessada de forma idempotente.
