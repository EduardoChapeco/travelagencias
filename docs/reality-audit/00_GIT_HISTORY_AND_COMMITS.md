# Histórico Git e Commits Recentes

Este documento faz parte da Auditoria Técnica Forense do TravelAgencias/TravelOS e rastreia o histórico de commits, commits recentes e as modificações locais que ainda não foram consolidadas.

---

## 🔍 Histórico de Commits Recentes

Análise dos últimos commits da branch principal local:

1. **`2ac19cc`**: _fix(rooming-list): resolve typecheck errors and align with database schema_
   - Autor: Arquiteto de IA
   - Data: Recente (Junho 2026)
   - Escopo: Ajuste de tipagem no frontend para sync da rooming list.
2. **`60240f4`**: _fix: add deploy scripts with NODE_OPTIONS 8GB heap for Nitro SSR build_
   - Escopo: Solução de contorno para o heap overflow do build do Nitro (SSR) configurando o limite máximo de heap para 8GB.
3. **`c594808`**: _feat: dual-column contextual sidebar navigation..._
   - Escopo: Nova navegação com sidebar lateral dividida (SlimSidebar de 56px + painel de contexto de 220px) com remoção do estado anterior de pinagem do AppShell.
4. **`b68316e`**: _style: restore original expandable sidebar, apply responsiveness fixes, and optimize layouts_
   - Escopo: Restauração/refatoração de estilos do sidebar principal.
5. **`16aa64b`**: _fix: upgrade Gemini API endpoint to v1 and migrate to gemini-2.5-flash..._
   - Escopo: Migração dos endpoints de `/v1beta/` para `/v1/` no Deno deploy e alteração dos modelos de extração OCR para `gemini-2.5-flash`.
6. **`8d5033e`**: _refactor: P0/P1/P2/P3 stabilization - security, OCR, gmail-sync, rooming, brand kit, dynamic imports_
   - Escopo: Mudanças estruturais nas Edge Functions e serviços de OCR/Email.

---

## 📂 Modificações Locais Não Consolidadas (Uncommitted Diffs)

Rastreado via `git diff --stat`. Atualmente, existem **31 arquivos modificados** localmente.

### 1. Code-Splitting e Lazy Loading (Vite/TanStack Router)

- **Modificados**:
  - `src/routes/agency.$slug.crm.$lead_id.tsx` (`-1633` linhas) -> Movido integralmente para o novo arquivo não rastreado `src/routes/agency.$slug.crm.$lead_id.lazy.tsx` (`+76KB`).
  - `src/routes/agency.$slug.group-tours.$id.tsx` (`-1917` linhas) -> Movido integralmente para o novo arquivo não rastreado `src/routes/agency.$slug.group-tours.$id.lazy.tsx` (`+93KB`).
  - `src/routes/agency.$slug.omnichannel.tsx` (`-1587` linhas) -> Movido integralmente para o novo arquivo não rastreado `src/routes/agency.$slug.omnichannel.lazy.tsx` (`+73KB`).
- **Sintoma**: Essa divisão de código reduziu o tamanho do bundle principal da rota, mas foi executada como remendo para o estouro de heap de memória (`max-old-space-size=8192`), sem de fato remover a dívida técnica da complexidade dessas páginas gigantes.

### 2. Sincronização do Schema do Supabase

- **Modificado**: `src/integrations/supabase/types.ts`
  - Adicionados campos à tabela `group_tours` (`rooming_list_status`, `rooming_list_sent_hotel`, `rooming_list_sent_bus`).
  - Adicionado campo `group_tour_id` à tabela `proposals`.
  - Criada nova tabela `payment_receipt_snapshots`.
  - Adicionadas funções RPC: `approve_group_enrollment` e `get_my_room_allocation`.
- **Divergência**: As tabelas do Orquestrador de IA (`ai_providers`, `ai_models`, `ai_api_credentials`, `ai_jobs`, `ai_job_attempts`), que constam na migration `20260710000000_ai_orchestrator_schema.sql`, **não** foram sincronizadas nas definições estáticas do arquivo `types.ts` do frontend.

### 3. Edge Functions (Correções de Hardening de Deno Deploy)

- **Modificado**: `supabase/functions/ai-orchestrator/index.ts`
  - Implementado segurança de isolamento multi-tenant (JWT + user_roles) e centralização de adaptadores.
- **Modificado**: `supabase/functions/landing-page-agent/index.ts`
  - Correção forense: Alterado `(supabase.rpc as any)` para `supabaseAdmin.rpc` (resolvendo um ReferenceError de variável indefinida que quebrava o chatbot do biolink).
