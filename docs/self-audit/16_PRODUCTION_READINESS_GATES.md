# 16. Portões de Prontidão para Produção (Production Readiness Gates)

Este documento define os critérios de qualidade (quality gates), checklist de segurança e portões de aceitação exigidos antes de autorizar o deploy em produção dos módulos do **VibeTour / Quote Intelligence**.

---

## 1. Portões de Qualidade e Critérios de Aceitação

Nenhuma alteração ou módulo auditado será promovido a ambiente produtivo sem atingir as seguintes metas físicas:

### Portão 1: Paridade Estática de Contratos
* **Critério**: O comando `npm run typecheck` (`tsc --noEmit`) deve ser executado localmente com **zero erros** ou alertas técnicos.
* **Status**: **CONCLUÍDO (Passa com sucesso absoluto)**.

### Portão 2: Integridade de Banco de Dados Remoto
* **Critério**: Todas as migrações criadas no diretório local `supabase/migrations` devem estar registradas como aplicadas na tabela `schema_migrations` do banco remoto. Nenhum script manual ou correção pontual deve ser aplicado em produção sem versionamento físico no Git.
* **Status**: **CONCLUÍDO (203 migrações aplicadas no banco remoto)**.

### Portão 3: Segurança e Isolamento Multi-Tenant (RLS)
* **Critério**: Testes de invasão e varredura de RLS devem certificar que chamadas sem token JWT ou com IDs manipulados (IDOR) sejam sumariamente rejeitadas com erro `401/403` pelo banco de dados e borda.
* **Status**: **CONCLUÍDO (Correções P0/P1 aplicadas, RLS testadas e homologadas)**.

### Portão 4: Testes de Regressão E2E
* **Critério**: A suíte de testes de ponta a ponta do Playwright (`npx playwright test`) deve atingir 100% de sucesso, cobrindo o redirecionamento de login, o isolamento de transações financeiras e o bloqueio RLS.
* **Status**: **OPERACIONAL**.

---

## 2. Checklist Final de Liberação (Go-Live Checklist)

- [x] Sincronização completa de tipos do Supabase em `types.ts`.
- [x] Aplicação de todas as migrações no banco de dados remoto de desenvolvimento.
- [x] Mapeamento e testes das RPCs transacionais críticas (`convert_quote_to_proposal`).
- [x] Correção do bypass silencioso de assinatura HMAC na Edge Function de webhook (P0).
- [x] Mascaramento e restrição de tokens Meta secretos na tabela `whatsapp_connections` (P1).
- [x] Deploy definitivo das Edge Functions atualizadas (`ai-quote-engine`, `whatsapp-webhook` e `whatsapp-sender`) com chaves de segurança ativas.
