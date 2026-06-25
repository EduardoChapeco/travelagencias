# Plano de Estabilização Faseado (Fases P0 a P8)

Este documento define as fases de implementação para sanar os problemas de infraestrutura de IA e OCR identificados na auditoria, detalhando a causa raiz, arquivos envolvidos, migrações e critérios de aceitação.

---

## Fase P0 — Segurança, JWT e Isolamento de Tenants

### 1. Causa Raiz

As Edge Functions `ai-orchestrator`, `generate-site-ai`, `landing-page-agent` e `google-business-post` aceitam o parâmetro `agency_id` do body da requisição e realizam operações via cliente administrativo `service_role` sem cruzar dados de membership do usuário autenticado no JWT do header.

### 2. Evidência no Código

Nas linhas 147-150 e 176 do arquivo `supabase/functions/ai-orchestrator/index.ts`, o cliente admin é instanciado e o `agencyId` é resolvido do body diretamente sem validação de vínculo na tabela `user_roles`.

### 3. Arquivos e Edge Functions Envolvidos

- `supabase/functions/ai-orchestrator/index.ts`
- `supabase/functions/generate-site-ai/index.ts`
- `supabase/functions/landing-page-agent/index.ts`
- `supabase/functions/google-business-post/index.ts`

### 4. Tabelas de Banco e Migrations

- Tabela `public.user_roles` (utilizada para checar membership e permissão).

### 5. Estratégia de Rollback

Reverter o arquivo da Edge Function para a versão anterior via Git checkout do commit de baseline (`2ac19cc`).

### 6. Critério de Pronto (DoD)

- Qualquer chamada às 4 funções informando um `agency_id` que o usuário logado não possui nas `user_roles` retorna `403 Forbidden`.
- Chamadas com token JWT inválido ou ausente retornam `401 Unauthorized`.

---

## Fase P1 — Estruturação do Orquestrador Central e Modelos

### 1. Causa Raiz

Inexistência de uma tabela centralizada de modelos e credenciais mascaradas, forçando duplicidade de códigos de leitura e descriptografia de credenciais em cada Edge Function.

### 2. Arquivos e Edge Functions Envolvidos

- `supabase/functions/ai-orchestrator/index.ts` (Core)
- Criação de arquivos de utilitários de criptografia unificados.

### 3. Tabelas de Banco e Migrations

- **Nova Migration**: `20260710000000_ai_orchestrator_schema.sql` contendo:
  - Criação das tabelas `ai_providers`, `ai_models` e `ai_api_credentials`.
  - Criação da RPC `pick_active_api_key` atualizada.

### 4. Critério de Pronto (DoD)

- Execução bem-sucedida da migration local e typecheck de 100% de sucesso.
- O banco de dados registra provedores e modelos homologados de IA.

---

## Fase P2 — Integração e Adaptação do Gemini Principal

### 1. Causa Raiz

Uso de chamadas descentralizadas e endpoints instáveis (mistura de endpoints `/v1/` e `/v1beta/` com modelos antigos).

### 2. Arquivos e Edge Functions Envolvidos

- `supabase/functions/ai-orchestrator/index.ts` (Inclusão de adaptadores para Gemini).

### 3. Critério de Pronto (DoD)

- O orquestrador executa com sucesso chamadas para `gemini-2.5-flash` usando a API `/v1/`.
- Suporta processamento estruturado nativo de PDFs e Imagens.

---

## Fase P3 — Adaptação de Fallback Provedores (Groq / OpenAI)

### 1. Causa Raiz

Mapeamento incorreto de capacidades (fallbacks de PDF no Groq, causando estouro e erros 400).

### 2. Arquivos e Edge Functions Envolvidos

- `supabase/functions/ai-orchestrator/index.ts` (Inclusão de adaptadores OpenAI e Groq).

### 3. Critério de Pronto (DoD)

- Fallback de imagem e texto operacionais no Groq e OpenAI.
- O orquestrador bloqueia tentativas de envio de PDF para o Groq (Llama Vision).

---

## Fase P4 — Integração de Scraping (Firecrawl)

### 1. Causa Raiz

Integração de Scraping mockada na Edge Function.

### 2. Arquivos e Edge Functions Envolvidos

- `supabase/functions/ai-orchestrator/index.ts` (Ação `scrape` real).

### 3. Critério de Pronto (DoD)

- O scrape de concorrentes utiliza a API real do Firecrawl caso a chave esteja cadastrada, com fallback para tratamento seguro de erro se indisponível.

---

## Fase P5 — Fila de Processamento de OCR (Jobs Assíncronos)

### 1. Causa Raiz

Processamento síncrono e uploads base64 volumosos sob risco de estouro de timeout HTTP de 60s.

### 2. Tabelas de Banco e Migrations

- Criação das tabelas `ai_jobs` e `ai_job_attempts` no banco.

### 3. Critério de Pronto (DoD)

- O processamento de OCR cria um registro em `ai_jobs` com status `queued` e retorna imediatamente o ID para o cliente.
- Um worker (Edge Function em background ou trigger) processa o arquivo e altera o status para `completed` ou `failed`.

---

## Fase P6 — Migração de Módulos (Strangler Pattern)

### 1. Causa Raiz

Módulos frontend acionam funções legadas duplicadas.

### 2. Arquivos Envolvidos

- `src/services/proposals.ts`
- `src/lib/ocr-ai.ts`
- `src/routes/agency.$slug.trips.$id.passengers.tsx`
- `src/routes/agency.$slug.trips.$id.financial.tsx`

### 3. Critério de Pronto (DoD)

- Os 4 serviços frontend migram o acionamento para o endpoint unificado do orquestrador.

---

## Fase P7 — Interface Administrativa de Chaves (UI Settings)

### 1. Causa Raiz

A tela de credenciais expõe as chaves em formato aberto para o cliente.

### 2. Arquivos Envolvidos

- `src/services/settings.ts`
- `src/routes/agency.$slug.settings.tsx` (Aba de integração).

### 3. Critério de Pronto (DoD)

- A UI de chaves apenas exibe a versão mascarada (`masked_hint`) das credenciais.
- Ao cadastrar, a chave inteira é enviada e salva criptografada, mas nunca mais retorna aberta em selects de rede.

---

## Fase P8 — Hardening e Testes Automatizados

### 1. Causa Raiz

Falta de cobertura de testes de isolamento de tenants, cota de rate limit e cenários de arquivos corrompidos.

### 2. Critério de Pronto (DoD)

- Suite de testes ponta a ponta executada sob dados artificiais.
- Validação de 100% de sucesso contra acessos cruzados (Cross-tenant security).
