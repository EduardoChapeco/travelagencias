# Auditoria de Cálculos Existentes (Turis)

Este documento analisa as fórmulas matemáticas e regras financeiras implementadas no backend e no frontend do Turis, identificando inconsistências, riscos operacionais e desvios em relação ao master PRD.

---

## 1. Fórmulas de Negócio Identificadas no Código

### 1.1 Faturamento e Margem da Viagem (`trip_financial_summary`)

Na RPC [public.trip_financial_summary](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260605000001_schema_fixes_production.sql#L275-L327):

- **Receita (Revenue)**: $\sum \text{amount\_brl}$ de registros onde $\text{type} = \text{'income'}$ e $\text{status} \neq \text{'cancelled'}$.
- **Custo (Cost)**: $\sum \text{amount\_brl}$ de registros onde $\text{type} = \text{'expense'}$ e $\text{status} \neq \text{'cancelled'}$.
- **Margem Líquida**: $\text{Receita} - \text{Custo}$.
- **Margem %**: $\frac{\text{Margem Líquida}}{\text{Receita}} \times 100$.

### 1.2 Regras de Comissionamento no Gatilho (`calculate_trip_commission_trigger_fn`)

Na trigger [public.calculate_trip_commission_trigger_fn](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260614000004_dynamic_commissions.sql#L42-L134):

- **Base Comissionável**: $\sum \text{tarifa\_base}$ de todos os itens informados em `items_commission`.
- **Comissão da Agência**: $\sum \left( \frac{\text{tarifa\_base} \times \text{agency\_commission\_pct}}{100} \right) + \text{bonus\_item}$.
- **Comissão do Vendedor**: $\sum \left( \frac{\text{tarifa\_base} \times \text{agent\_commission\_pct}}{100} \right)$.
- **Lucro Líquido Esperado (net_profit)**: $\text{Comissão Agência} - \text{Comissão Agente}$.

---

## 2. Inconsistências Matemáticas e Gaps de Implementação

### 2.1 Mismatch de Regras de Arredondamento

- **Problema**: O backend executa divisão de moedas (`numeric` com precisão padrão do PostgreSQL), enquanto o frontend muitas vezes formata os valores usando `toFixed(2)` ou `toLocaleString`. Isso gera divergências de centavos em vendas volumosas.
- **Impacto**: Divergências no fluxo de caixa consolidado e no DRE mensal.
- **Correção**: Implementar arredondamento explícito truncado ou simétrico de duas casas decimais no cálculo final do banco (`ROUND(..., 2)`).

### 2.2 Inexistência do Modelo de Faixa Progressiva

- **Problema**: O PRD exige suporte a dois modelos de comissionamento de vendedor: **Faixa Integral** (onde a alíquota da maior faixa atingida é aplicada sobre todo o faturamento) e **Faixa Progressiva** (onde o faturamento é fatiado entre as faixas, aplicando alíquotas marginais).
- **Estado Atual**: A trigger `calculate_trip_commission_trigger_fn` apenas resolve a alíquota final do agente de forma **integral** (aplicando o maior percentual sobre todo o faturamento), não possuindo suporte lógico para cálculo progressivo em fatias.
- **Impacto**: O agente recebe valores incorretos se a agência adotar o modelo de faixa progressiva (por exemplo, pagando 1% nos primeiros R$ 50.000, 2% na faixa seguinte, etc.).

### 2.3 Conversão Cambial (Câmbio Multimoedas)

- **Problema**: `financial_records` possui colunas `currency`, `exchange_rate` e `amount_brl`. Contudo, não existe um processo no banco de dados para atualizar e travar a cotação histórica do câmbio na data do faturamento ou do recebimento. O cálculo de conversão é delegado ao frontend ou inserido sem verificação de taxa de câmbio no ato da baixa.
- **Impacto**: DRE distorcido em agências que operam pacotes internacionais em dólares (USD) ou euros (EUR).
