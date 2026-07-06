# 09. Plano de Compatibilidade de Banco e Schemas (Schema Compatibility Plan)

Este documento estabelece a especificação relacional e as chaves estrangeiras necessárias para garantir compatibilidade estrutural com as tabelas pré-existentes do Turis.

---

## 1. Integridade Relacional e Chaves Estrangeiras (Concluído)

Todas as chaves estrangeiras, deletes em cascata e constraints foram fisicamente aplicadas no banco remoto e mapeadas de forma 100% segura sem coerções:
- `quote_requests` referenciando `agencies`, `leads`, `clients`, `users`.
- `quote_search_plans` / `quote_scenarios` referenciando `quote_requests`.
- `normalized_offers` referenciando `quote_requests` e `quote_scenarios`.
- `package_candidates` / `package_candidate_components` / `package_scorecards` ligando de forma unívoca ofertas normalizadas a pacotes cotados.

---

## 2. Estratégia de RLS (Row-Level Security) (Concluído)

Políticas físicas de RLS foram ativadas e homologadas para todas as tabelas:
- Membros autenticados de uma agência só visualizam cotações e propostas cuja coluna `agency_id` seja correspondente ao tenant do usuário logado (`is_agency_member(auth.uid(), agency_id)`).
- Chaves confidenciais da Meta API em `whatsapp_connections` restringem-se ao papel de `'agency_admin'`.

---

## 3. Sincronização de Tipos TS

- **Resultado**: Geramos e sincronizamos os tipos no arquivo `src/integrations/supabase/types.ts` conectando diretamente ao banco remoto e rodando validação via `tsc --noEmit`. Compilação livre de erros.
