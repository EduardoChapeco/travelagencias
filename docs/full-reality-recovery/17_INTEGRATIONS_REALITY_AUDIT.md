# 17 Auditoria Real das Integrações

Este documento analisa o status real das conexões externas operacionais, definindo dependências de credenciais em produção e o mapeamento de webhooks.

---

## 1. Integração WhatsApp Cloud API (Meta Graph API)
* **Status:** 🟢 Edge Functions de recebimento (`whatsapp-webhook`) e envio (`whatsapp-sender`) deployadas.
* **Tabela Associada (Histórico):** `omnichannel_messages` (legado) e `messages` (novo).
* **Bloqueio Externo:** Exige credenciais da conta de desenvolvedor da Meta (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`) configuradas em `credentials` no Supabase por agência.
* **Caminho Crítico Encontrado:** O webhook atualmente grava na tabela antiga `omnichannel_messages`. É obrigatório remapear o INSERT na Edge Function para a tabela `messages` do novo Inbox para unificar a comunicação.

---

## 2. Sincronizador Gmail (OAuth2)
* **Status:** 🟢 Edge Functions `gmail-oauth`, `gmail-sync` e `gmail-send` deployadas.
* **Tabela Associada:** `messages` do Inbox.
* **Funcionamento:** Sincronização em segundo plano das threads de e-mail integradas ao fluxo omnichannel, permitindo respostas no formato white-label diretamente pelo painel de inbox do TravelOS.

---

## 3. Conector Infotravel (GDS)
* **Status:** 🟢 Edge Function `infotravel-connector` e jobs cron de sincronização de reservas deployados.
* **Tabelas Associadas:** `infotravel_sync_jobs`, `trips`.
* **Mapeamento:** Importação atômica das confirmações e e-tickets das companhias aéreas e hotéis GDS diretamente para o painel de passageiros do TravelOS.
