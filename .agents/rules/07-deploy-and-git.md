# Rule 07 — Deploy Completo & Git

## Sequência obrigatória (nesta ordem — nunca pular etapa)

### FASE 1 — Auditoria de Código (Pré-deploy)
```bash
# TypeScript zero erro
powershell -ExecutionPolicy Bypass -Command "npm run typecheck"

# Build de produção limpo (8GB RAM — necessário para projeto de escala)
powershell -ExecutionPolicy Bypass -Command "npm run build"
# build script já inclui: cross-env NODE_OPTIONS=--max-old-space-size=8192 vite build
```
**Tolerância zero:** código quebrado nunca passa para produção.

### FASE 2 — Gate de Segurança (executar antes do push ao banco)
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Se retornar qualquer linha: BLOQUEIO. Criar migration de RLS primeiro.
```

### FASE 3 — Deploy Backend (Supabase)
```bash
powershell -ExecutionPolicy Bypass -Command "npx supabase db push"
powershell -ExecutionPolicy Bypass -Command "npx supabase functions deploy"
powershell -ExecutionPolicy Bypass -Command "npx supabase gen types typescript --linked > src/types/supabase.ts"
```
- Project Ref: `esmppoxxnyiscidzsjvy`
- Fallback se CLI falhar: usar MCP `supabase-mcp-server` → `apply_migration` + `deploy_edge_function`

### FASE 4 — Deploy Frontend (Cloudflare Pages via Wrangler)
```bash
powershell -ExecutionPolicy Bypass -Command "npx wrangler pages deploy dist --project-name travelagencias --branch main --commit-dirty=true"
```
- URL de produção: `https://travelagencias.pages.dev/`
- Se `CLOUDFLARE_API_TOKEN` não configurado: emitir laudo técnico com comando exato para usuário executar

### FASE 5 — Git
```bash
git add -A
git pull --rebase origin main
# Resolver conflitos semanticamente — nunca escolher "último que chegou" sem análise
git commit -m "feat|fix|refactor|security|perf(módulo): descrição do que mudou e por quê"
git push origin main
```
**Nunca:** `git push --force` sem análise explícita e aprovação do usuário.

### FASE 6 — Smoke Test Pós-Deploy
- Confirmar `https://travelagencias.pages.dev/` respondendo
- Confirmar Edge Functions ativas
- Relatório: o que foi deployado, quais migrations rodaram, quais funções foram atualizadas

## Fail-Safe (se etapa for irrecuperável)
Emitir **Laudo Técnico Cirúrgico** com:
1. Qual etapa falhou e código de erro exato
2. Quais arquivos/recursos envolvidos
3. Comando exato (copy/paste ready) para o usuário executar localmente

## Regras de Commit
- Mensagens semânticas: `feat`, `fix`, `refactor`, `security`, `perf`, `chore`, `docs`
- Nunca commit de código com erros de TypeScript
- Nunca commit de `service_role` key em src/
