# 05. Contract and Schema Parity (Paridade de Contrato e Esquema)

## 1. Mapeamento de Tipagem e TypeScript

### `whatsapp_connections` vs view `whatsapp_connections_public`
* **Tabela Base:** `whatsapp_connections` possui segredos e tokens sensíveis (`secret_reference`, `token_reference`, `verify_token_reference`).
* **View Pública:** `whatsapp_connections_public` expõe apenas dados de identificação (`id`, `agency_id`, `waba_id`, `phone_number_id`, `display_name`, `status`, `provider`, `created_at`, `updated_at`).
* **TypeScript Parity:** O frontend consome os dados tipados via os tipos gerados do banco, mas em alguns pontos usa casts manuais ou `as any` para acessar propriedades estendidas de configurações do canal.

### `messages` e `conversations`
* **Tabela `conversations`:** Possui chaves estrangeiras com `contacts(id)` e `channels(id)`.
* **Tabela `messages`:** Possui `conversation_id` e `agency_id`.
* **TypeScript Parity:** O Inbox faz a consulta unificada contendo joins aninhados:
  ```typescript
  .from("conversations")
  .select(`
    *,
    contacts(*),
    channels(*),
    messages(*)
  `)
  ```
  Isso é mapeado diretamente para o tipo `Conversation` declarado no frontend com paridade aceitável.
