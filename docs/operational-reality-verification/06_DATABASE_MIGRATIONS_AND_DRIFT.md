# 06. Database Migrations and Drift (Migrações do Banco e Desvios)

## 1. Migrations Aplicadas vs Locais
* **Desvios Identificados (Drifts):**
  * O schema local de `whatsapp_connections` foi estendido com colunas para suportar outros provedores e compliance legal na migration `20260804000000_meta_connections_evolution.sql`.
  * Essas novas colunas (`provider`, `connection_mode`, `verified_name`, `page_id`, `instagram_account_id`, `scopes_authorized`, `token_expiration`, etc.) e as tabelas `data_subject_requests` e `data_subject_request_evidence` **não estão aplicadas remotamente em produção** porque o Supabase CLI local não está autenticado por falta de `SUPABASE_ACCESS_TOKEN`.
  * Isso causa um drift de esquema entre o ambiente de desenvolvimento local (onde a migration foi declarada) e o ambiente de produção publicado (onde as tabelas de exclusão de dados e as novas colunas de conexões ainda não existem).

## 2. Ações de Correção de Drift
* É fundamental aplicar a migração no banco remoto executando o script SQL no painel de controle do Supabase remoto antes de tentar homologar ou utilizar o fluxo de exclusão de dados em produção.
