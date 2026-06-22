# Modelo de Banco de Dados Proposto (Schema SQL)

Este documento define o schema das tabelas necessárias para suportar a infraestrutura unificada do `AI Provider & API Key Orchestration` no PostgreSQL.

---

## 1. Diagrama Lógico de Tabelas

```txt
  +------------------+         +------------------+         +-----------------------+
  |   ai_providers   | <-----+ |    ai_models     | <-----+ | ai_provider_incidents |
  +------------------+         +------------------+         +-----------------------+
           ^                            ^
           |                            |
  +------------------+         +------------------+         +-----------------------+
  |ai_api_credentials|         |     ai_jobs      | <-----+ |    ai_job_attempts    |
  +------------------+         +------------------+         +-----------------------+
           |                            |
  +------------------+         +------------------+
  | ai_budget_limits |         | ai_request_logs  |
  +------------------+         +------------------+
```

---

## 2. Estrutura DDL Proposta

### ai_providers
Tabela de catálogo contendo os provedores homologados de IA.
```sql
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- 'gemini', 'openai', 'groq', 'openrouter', 'firecrawl'
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  base_url text,
  auth_type text, -- 'bearer', 'query', 'custom'
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### ai_models
Catálogo de modelos associados aos provedores e suas capacidades.
```sql
CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_code text NOT NULL UNIQUE, -- 'gemini-2.5-flash', 'gpt-4o-mini', 'llama3-70b-8192'
  modalities text[] NOT NULL DEFAULT '{}', -- '{text, vision, pdf}'
  context_limit int,
  output_limit int,
  supports_json_schema boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### ai_api_credentials
Armazena referências mascaradas de credenciais e status de saúde de forma segura (substitui/evolui a tabela `api_keys`).
```sql
CREATE TABLE public.ai_api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- NULL indica chave global da plataforma
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  secret_reference text NOT NULL, -- Referência segura ou texto encriptado por AES GCM
  fingerprint text NOT NULL UNIQUE, -- Hash único da chave para evitar duplicação física
  masked_hint text NOT NULL, -- Ex: 'AIzaSy...4x9Z'
  status text NOT NULL DEFAULT 'healthy', -- 'healthy', 'degraded', 'rate_limited', 'invalid', 'disabled'
  priority int NOT NULL DEFAULT 0, -- Prioridade de roteamento (valores menores = maior prioridade)
  daily_limit int DEFAULT 1000, -- Limite de requests diários permitidos
  monthly_limit int DEFAULT 20000, -- Limite de requests mensais
  cooldown_until timestamptz,
  last_used_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### ai_jobs
Fila de processamento assíncrono para OCR e tarefas de IA pesadas.
```sql
CREATE TABLE public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  feature text NOT NULL, -- 'ocr_proposal', 'ocr_voucher', 'ocr_passenger', 'ocr_boleto'
  input_reference text NOT NULL, -- URL do arquivo privado no storage ou ID do bucket
  status text NOT NULL DEFAULT 'queued', -- 'queued', 'preprocessing', 'running', 'completed', 'failed', 'cancelled'
  priority int NOT NULL DEFAULT 10,
  idempotency_key text UNIQUE, -- sha256 do arquivo + feature
  requested_by uuid REFERENCES auth.users(id),
  result_payload jsonb, -- Resultado final estruturado da extração
  error_payload jsonb, -- Log de erro detalhado caso falhe
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
```

### ai_job_attempts
Registro de tentativas de execução de cada Job.
```sql
CREATE TABLE public.ai_job_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ai_jobs(id) ON DELETE CASCADE,
  attempt int NOT NULL,
  provider_id uuid REFERENCES public.ai_providers(id),
  model_id uuid REFERENCES public.ai_models(id),
  credential_id uuid REFERENCES public.ai_api_credentials(id),
  latency_ms int,
  input_tokens int,
  output_tokens int,
  estimated_cost numeric(10,6),
  http_status int,
  error_message text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 3. Diretrizes de RLS (Segurança Multi-Tenant)

1. **`ai_providers` & `ai_models`**: Leitura pública para usuários autenticados. Escrita restrita a `super_admin`.
2. **`ai_api_credentials`**: Leitura e escrita restritas à agência do usuário logado (`agency_id = user.agency_id`) e somente por membros com cargo de `agency_admin`. A coluna `secret_reference` nunca deve ser retornada em selects comuns do cliente (View mascarada ou restrição de select via coluna).
3. **`ai_jobs` & `ai_job_attempts`**: Visíveis apenas para membros autenticados da agência proprietária (`agency_id` do usuário igual ao do registro).
