# 00. Baseline Local, Remote, and Production (Linha de Base)

## 1. Status do Repositório Git e Working Tree
* **Branch Atual:** `main` (ou branch ativo local).
* **HEAD Local:** `2026-06-28` — desenvolvimento ativo.
* **Divergência Local vs Origem:** O working tree local contém os últimos arquivos de migrations adicionados na sessão anterior, que ainda não foram sincronizados ou executados remotamente por conta de restrições de permissão do Supabase CLI sem login.

## 2. Status das Migrations
* **Locais (no diretório `supabase/migrations/`):**
  * As migrations até `20260803000000_fix_tasks_rls_insert.sql` e a nova `20260804000000_meta_connections_evolution.sql` existem localmente como arquivos versionados.
* **Remotas (Banco de Dados Staging/Produção):**
  * Nem todas as últimas migrations locais (como a `20260804000000` de compliance legal) foram aplicadas na instância de produção remota do Supabase. A aplicação dessas migrations no Supabase remoto depende de autorização explícita de cutover ou da chave administrativa.

## 3. Edge Functions
* **whatsapp-webhook:** A versão local possui validação HMAC de segredo e inserção direta no novo modelo de mensagens (`messages` / `conversations`), mas a função em produção remota pode ter divergências no tratamento de assinaturas devido ao token global.
* **whatsapp-sender:** Envio operacional local via invocação do Graph API `/messages` se houver token válido.
* **meta-capi-sync:** Sincroniza eventos de propostas `converted` com a Conversion API da Meta.
