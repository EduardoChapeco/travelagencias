# Matriz de Contratos: UI vs. Tabelas do Banco — Rodada 3 (TravelOS)

Este documento mapeia o acoplamento de dados entre as rotas de interface no frontend e as tabelas reais do banco de dados PostgreSQL.

---

## 1. Mapeamento de Rotas Contábeis e Financeiras

| Rota do Frontend                   | Elemento da UI           | Tabela / View de Banco                                                          | Tipo de Acoplamento |
| :--------------------------------- | :----------------------- | :------------------------------------------------------------------------------ | :-----------------: |
| `/agency/$slug/financial/cash`     | Fluxo de Caixa           | `public.cash_registers`<br>`public.cash_sessions`<br>`public.cash_transactions` |    Direto / Real    |
| `/agency/$slug/financial/groups`   | Painel de Rentabilidade  | `public.group_tours_financial_summary` (View)                                   |   Agregado / Real   |
| `/agency/$slug/financial/ledger`   | Lançamentos de Auditoria | `public.financial_ledger_entries`                                               |    Direto / Real    |
| `/agency/$slug/settings/financial` | Travamento e Comissões   | `public.monthly_closing_periods`<br>`public.seller_commission_plans`            |    Direto / Real    |
| `/agency/$slug/group-tours/$id`    | Detalhes e Inscrições    | `public.group_tour_enrollments`<br>`public.group_tour_costs`                    |    Direto / Real    |

---

## 2. Status de Tipagem Estática (TypeScript)

O arquivo [types.ts](file:///c:/Users/Excelência%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/integrations/supabase/types.ts) está completamente sincronizado, contendo as declarações de tipo completas da view `group_tours_financial_summary` e da tabela `financial_ledger_entries`, garantindo type safety nativo em toda a aplicação.
