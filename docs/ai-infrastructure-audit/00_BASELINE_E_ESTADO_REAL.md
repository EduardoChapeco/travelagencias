# Baseline e Estado Real da Infraestrutura de IA e Integrações

Este documento registra o estado real do repositório, histórico de commits, sincronização de banco de dados e Edge Functions em produção para servir como baseline técnico da auditoria de IA.

---

## 1. Estado do Repositório Git

- **Branch Atual**: `main`
- **HEAD Local**: `2ac19ccef0ee019db450238f51b6bf4efa3297ac`
- **Commit do Upstream (origin/main)**: `b68316e34ec826bd3b7d14ea05f6d166b310e203`
- **Divergência Local/Remoto**: O working tree local está 3 commits à frente do upstream, contendo as otimizações do Nitro SSR, tipo de rooming-list e reestruturação da navegação lateral.
- **Modificações Locais Não Commitadas**:
  - Adicionados arquivos estáticos das 3 rotas lazy (`.lazy.tsx`).
  - Atualização do `src/routeTree.gen.ts` para usar lazy imports.
  - Separação do editor rico (`RichTextEditorInner.tsx`).
  - Correção do typecheck no `vite.config.ts`.

---

## 2. Estado do Supabase e Banco de Dados

- **Project Reference ID**: `esmppoxxnyiscidzsjvy`
- **Status das Migrações**:
  - A tabela operacional e todas as migrations de base estão aplicadas no banco remoto até a data de `2026-07-01`.
  - **Duas migrations locais estão como pendentes (não aplicadas no banco remoto)**:
    1. `20260702000000_group_rooming_list_status.sql` — Adiciona status na rooming list.
    2. `20260703000000_group_hub_corrective_rpcs.sql` — Corrige e implementa as RPCs do dashboard de Grupos.

---

## 3. Estado das Edge Functions Deploiadas (Produção)

No projeto Supabase remoto, existem **24 Edge Functions** ativas e deploiadas em produção:

| Nome da Edge Function    | Slug / Rota de Chamada   | JWT Exigido? | Status no Servidor |
| :----------------------- | :----------------------- | :----------: | :----------------- |
| `ai-voucher-ocr`         | `ai-voucher-ocr`         |     Sim      | ACTIVE             |
| `generate-proposal-pdf`  | `generate-proposal-pdf`  |     Sim      | ACTIVE             |
| `web-push`               | `web-push`               |     Sim      | ACTIVE             |
| `whatsapp-sender`        | `whatsapp-sender`        |     Sim      | ACTIVE             |
| `admin-secure-keys`      | `admin-secure-keys`      |     Sim      | ACTIVE             |
| `meta-capi-sync`         | `meta-capi-sync`         |     Sim      | ACTIVE             |
| `ocr-proposal`           | `ocr-proposal`           |     Sim      | ACTIVE             |
| `search-unsplash`        | `search-unsplash`        |     Sim      | ACTIVE             |
| `whatsapp-webhook`       | `whatsapp-webhook`       |     Sim      | ACTIVE             |
| `ai-message-processor`   | `ai-message-processor`   |     Sim      | ACTIVE             |
| `ai-orchestrator`        | `ai-orchestrator`        |     Sim      | ACTIVE             |
| `google-business-post`   | `google-business-post`   |     Sim      | ACTIVE             |
| `ocr-passenger-document` | `ocr-passenger-document` |     Sim      | ACTIVE             |
| `client-token-login`     | `client-token-login`     |     Sim      | ACTIVE             |
| `generate-site-ai`       | `generate-site-ai`       |     Sim      | ACTIVE             |
| `gmail-sync`             | `gmail-sync`             |     Sim      | ACTIVE             |
| `mcp-llms-txt`           | `mcp-llms-txt`           |     Sim      | ACTIVE             |
| `meta-catalog-feed`      | `meta-catalog-feed`      |     Sim      | ACTIVE             |
| `ai-task-evaluator`      | `ai-task-evaluator`      |     Sim      | ACTIVE             |
| `ocr-boleto`             | `ocr-boleto`             |     Sim      | ACTIVE             |
| `gmail-send`             | `gmail-send`             |     Sim      | ACTIVE             |
| `landing-page-agent`     | `landing-page-agent`     |     Sim      | ACTIVE             |
| `infotravel-connector`   | `infotravel-connector`   |     Sim      | ACTIVE             |
| `supplier-ocr-extractor` | `supplier-ocr-extractor` |     Sim      | ACTIVE             |

---

## 4. Secrets e Variáveis de Ambiente Existentes (Somente Nomes)

- **Secrets operacionais configurados na nuvem do Supabase**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY` (Chave global fallback)
  - `GROQ_API_KEY` (Chave global fallback)
  - `OPENAI_API_KEY` (Chave global fallback)
  - `OPENROUTER_API_KEY` (Chave global fallback)
  - `API_KEY_SECRET` (Utilizado para criptografia AES local na tabela `api_keys`)
  - `MASTER_ENCRYPTION_KEY` (Utilizado para descriptografia dos dados em `global_settings`)
