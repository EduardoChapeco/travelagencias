# 09. Plano de Compatibilidade de Banco e Schemas (Schema Compatibility Plan)

Este documento estabelece a especificação relacional e as chaves estrangeiras necessárias para garantir compatibilidade estrutural com as tabelas pré-existentes do TravelOS.

---

## 1. Integridade Relacional e Chaves Estrangeiras

Para evitar registros órfãos ou duplicações na ingestão de dados, as tabelas novas do motor inteligente seguirão as seguintes regras de integridade:

- `quote_requests`:
  - `agency_id` refere-se a `public.agencies(id)` [ON DELETE CASCADE]
  - `lead_id` refere-se a `public.leads(id)` [ON DELETE SET NULL]
  - `client_id` refere-se a `public.clients(id)` [ON DELETE SET NULL]
  - `assigned_agent_id` refere-se a `auth.users(id)` [ON DELETE SET NULL]
- `quote_search_plans` / `quote_scenarios`:
  - Chave estrangeira vinculando de forma unívoca ao request de origem (`quote_request_id`).
- `normalized_offers`:
  - Referência física a `quote_request_id` e `scenario_id`.
- `package_candidates` / `package_candidate_components`:
  - As tabelas associam os componentes selecionados às ofertas normalizadas.
- `decision_records`:
  - Vincula o `quote_request_id` à decisão do agente, referenciando o `selected_package_id`.

---

## 2. Estratégia de RLS (Row-Level Security)

Todas as novas tabelas devem possuir a trava de segurança física habilitada no PostgreSQL:

```sql
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da agência possuem acesso às cotações"
  ON public.quote_requests
  FOR ALL
  TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));
```

_Esta política garante que operadores de agências concorrentes nunca consigam ler cotações ou cenários uns dos outros._
