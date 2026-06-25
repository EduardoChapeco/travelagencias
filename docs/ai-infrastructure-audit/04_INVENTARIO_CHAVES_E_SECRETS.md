# Inventário de Chaves, Secrets e Variáveis de Ambiente

Este documento cataloga onde e como as chaves de API, credenciais e secrets de criptografia são armazenados no TravelAgencias/TravelOS, mapeando suas fontes de configuração e o fluxo de acesso seguro.

---

## 1. Armazenamento Dinâmico de Credenciais (Tabela `api_keys`)

A tabela `public.api_keys` no banco de dados operacional é a principal fonte de credenciais configuradas pelas agências (Multi-Tenant).

- **Chaves Armazenadas**:
  - Chaves de API específicas de cada Agência (`agency_id IS NOT NULL`) para os provedores `gemini`, `groq`, `openai`, `openrouter`.
  - Chaves globais de plataforma (`agency_id IS NULL`).
- **Formato**:
  - Para segurança, as chaves salvas são encriptadas no banco de dados e prefixadas com delimitadores (identificadas pela presença de `=====`).
- **Secret de Descriptografia**:
  - Variável de ambiente `API_KEY_SECRET` (configurada nos secrets do Deno / Supabase Edge).

---

## 2. Configurações Globais (Tabela `global_settings`)

A tabela `public.global_settings` armazena configurações e chaves herdadas do sistema antigo.

- **Chave de Registro**: `integrations_config_encrypted`
- **Campos do JSON Descriptografado**:
  - `groq_key`
  - `gemini_key`
  - `openai_key`
  - `openrouter_key`
  - `firecrawl_key`
- **Secret de Descriptografia**:
  - Variável de ambiente `MASTER_ENCRYPTION_KEY` (configurada no Deno / Supabase Edge).

---

## 3. Variáveis de Ambiente de Fallback (Deno / Supabase Secrets)

Caso nenhuma chave seja resolvida dinamicamente das tabelas operacionais, as Edge Functions recorrem a variáveis de ambiente globais injetadas no ambiente de execução:

1. **`GEMINI_API_KEY`**: Chave global do Google Generative AI.
2. **`GROQ_API_KEY`**: Chave global para acesso rápido aos modelos Llama no Groq.
3. **`OPENAI_API_KEY`**: Chave global da OpenAI (DALL-E-3 e completions).
4. **`OPENROUTER_API_KEY`**: Chave global para acesso a modelos no OpenRouter.
5. **`FIRECRAWL_API_KEY`**: Chave global da plataforma Firecrawl para scraping.

---

## 4. Fluxo de Decisão de Credenciais

Quando um job de IA/OCR é iniciado, a credencial é selecionada seguindo esta hierarquia estrita:

```txt
1. Chamada à RPC pick_active_api_key (Chave específica da Agência)
   ↓ (Não encontrada ou inativa)
2. Chamada à RPC pick_active_api_key (Chave global de Plataforma em api_keys)
   ↓ (Não encontrada)
3. Descriptografia de integrations_config_encrypted em global_settings (Configuração de Plataforma)
   ↓ (Não encontrada)
4. Variáveis de ambiente globais injetadas via Deno.env (Fallback Final)
```
