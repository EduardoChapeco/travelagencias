# 00. Freeze e Baseline da Auditoria

Este documento registra o estado exato da aplicação, infraestrutura, banco de dados e deployments no momento da declaração de congelamento (Freeze) para fins de auditoria de integridade.

## 1. Identificação do Ambiente e Código

* **Branch Local:** `main`
* **Commit HEAD Local:** `e622c6745b95565f1acd1393fdcd4cd1d76a0773`
* **Commit Origin/Main:** `e622c6745b95565f1acd1393fdcd4cd1d76a0773`
* **Deploy Cloudflare Pages Ativo:** `https://travelagencias.pages.dev` (IP/Link dinâmico: `https://3b34956f.travelagencias.pages.dev`)
* **Commit Usado no Cloudflare:** `e622c6745b95565f1acd1393fdcd4cd1d76a0773` (ID da implantação: `3b34956f-a899-46fd-a347-48ca9ed74b75`, concluído em 20 de Junho de 2026 às 19:31 UTC-3).

## 2. Estado do Banco de Dados e Migrations

* **Projeto Supabase Remoto:** `esmppoxxnyiscidzsjvy`
* **Total de Migrations Locais:** 174 migrations na pasta `supabase/migrations/`
* **Total de Migrations Remotas Aplicadas:** 174 migrations aplicadas (todas correspondendo exatamente à numeração local, inclusive a última `20260628000000_cash_registers_and_group_costs.sql`).
* **Nota Crítica sobre a Última Migration:** A migration remota `20260628000000` foi aplicada com sucesso no Postgres, porém ela contém erros graves de referência de tabela que estão causando falhas operacionais em produção (detalhado em `05_DATABASE_MIGRATIONS_RLS.md`).

## 3. Estado das Edge Functions

Estão implantadas 22 Edge Functions no projeto remoto, das quais as 4 de OCR foram atualizadas recentemente:

| Edge Function | Estado Remoto | JWT Ativo | Versão Remota | Última Atualização (Timestamp) |
| ------------- | ------------- | ---------: | ------------- | ------------------------------ |
| `ai-voucher-ocr` | ACTIVE | Sim | 11 | 2026-06-20 03:42:42 |
| `ocr-passenger-document` | ACTIVE | Sim | 8 | 2026-06-20 03:42:42 |
| `ocr-boleto` | ACTIVE | Sim | 7 | 2026-06-20 03:42:42 |
| `ocr-proposal` | ACTIVE | Sim | 12 | 2026-06-20 03:42:42 |
| `gmail-send` | ACTIVE | Sim | 9 | Anterior |
| `gmail-sync` | ACTIVE | Sim | 8 | Anterior |
| `whatsapp-webhook` | ACTIVE | Sim | 13 | Anterior |
| `ai-orchestrator` | ACTIVE | Sim | 10 | Anterior |
| `whatsapp-sender` | ACTIVE | Sim | 12 | Anterior |
| `web-push` | ACTIVE | Sim | 11 | Anterior |

## 4. Modificações Locais (Não Commitadas)

Os seguintes arquivos possuem alterações no diretório de trabalho que estão retidas devido ao congelamento de deploy:

1. **`supabase/migrations/20260628000000_cash_registers_and_group_costs.sql`**
   * *Modificação:* Altera as 7 referências da tabela inexistente `public.agency_users` para `public.user_roles` nas políticas RLS.
2. **`supabase/functions/ai-voucher-ocr/index.ts`, `ocr-boleto`, `ocr-passenger-document`, `ocr-proposal`**
   * *Modificação:* Refatora consultas à tabela `api_keys` de `supabaseClient` (que falhavam devido ao RLS restrito a administradores para agentes) para `supabaseAdmin` usando a secret `SUPABASE_SERVICE_ROLE_KEY`.
3. **`src/lib/ocr-ai.ts` & `src/routes/agency.$slug.trips.$id.vouchers.tsx`**
   * *Modificação:* Passa o parâmetro `agencyId` do frontend para a Edge Function de forma explícita.
4. **`package.json` & `pnpm-lock.yaml`**
   * *Modificação:* Adição da dependência `pg`.

## 5. Secrets Necessários no Ambiente (Sem Revelar Valores)

A operação correta da infraestrutura de produção requer a presença dos seguintes segredos nas variáveis de ambiente do Supabase e Cloudflare Pages:

* `SUPABASE_ACCESS_TOKEN` (Supabase CLI/Deploy)
* `SUPABASE_DB_PASSWORD` (Acesso direto à base)
* `SUPABASE_SERVICE_ROLE_KEY` (Token administrativo para Edge Functions)
* `API_KEY_SECRET` (Chave de descriptografia das chaves das agências)
* `MASTER_ENCRYPTION_KEY` (Chave de criptografia global)
* `GEMINI_API_KEY` (Chave global do Gemini como fallback)
* `GROQ_API_KEY` (Chave global do Groq como fallback)
