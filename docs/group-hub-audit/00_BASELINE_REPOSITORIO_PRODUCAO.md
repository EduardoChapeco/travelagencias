# 00. Baseline do Repositório (Produção)

Este documento registra a fotografia técnica exata do repositório no momento do início da auditoria técnica.

## 1. Status do Git e Branchs

- **Branch Atual**: `main`
- **Commit Local (HEAD)**: `2ac19ccef0ee019db450238f51b6bf4efa3297ac`
- **Commit do origin/main**: `b68316e3` (Estamos 3 commits à frente do `origin/main` localmente)
- **Commits Locais Relevantes adicionados**:
  - `2ac19cc` - _fix(rooming-list): resolve typecheck errors and align with database schema_
  - `60240f4` - _fix: add deploy scripts with NODE_OPTIONS 8GB heap for Nitro SSR build_
  - `c594808` - _feat: dual-column contextual sidebar navigation..._

## 2. Inventário de Arquivos Modificados (Unstaged)

- `src/components/shell/AppSidebar.tsx`
- `src/integrations/supabase/types.ts`
- `src/routeTree.gen.ts`
- `src/routes/agency.$slug.financial.tsx`
- `src/routes/agency.$slug.group-tours.$id.tsx`
- `src/routes/agency.$slug.rooming-list.tsx`
- `src/routes/client.trips.$id.tsx`
- `src/routes/p.$agency_slug.tour.$id.tsx`
- `src/services/client-area.ts`
- `src/styles.css`

## 3. Inventário de Novos Arquivos (Untracked)

- `src/components/financial/PaymentReceiptModal.tsx`
- `src/routes/agency.$slug.financial.groups.tsx`
- `supabase/migrations/20260702000000_group_rooming_list_status.sql`

## 4. Migrations do Supabase

- **Migration criada localmente**: `20260702000000_group_rooming_list_status.sql`
- **Nota**: A listagem remota de migrações e funções via Supabase CLI retornou erro `401 Unauthorized` devido à falta de credenciais explícitas (`SUPABASE_DB_PASSWORD`) no ambiente sandbox. No entanto, a migração local existe e está disponível no código-fonte.

## 5. Status de Deploy da Cloudflare

- **Projeto Wrangler Pages**: `travelagencias`
- **Últimos deploys de Produção**:
  - `d49fdb06` (12 horas atrás) - Commit associado: `c594808` (Status: Active)
  - `2f860640` (12 horas atrás) - Commit associado: `c594808` (Status: Success)
- **Status da Compilação Local**: Compilado localmente com sucesso via `npm run build:safe` usando aumento de heap do Node.js, com typecheck passando perfeitamente (`tsc --noEmit` bem-sucedido).
