# Fluxo de Comissionamento de Vendedores (TravelOS)

Este relatório detalha a dinâmica atual de cálculo e processamento das comissões de vendedores/agentes no TravelOS, confrontando o código atual com as diretrizes do master PRD.

---

## 1. Funcionamento do Fluxo Atual

O cálculo da comissão de agentes funciona de forma orientada a eventos no banco de dados:

1. **Geração/Atualização da Viagem**: Quando uma comissão é inserida ou modificada na tabela `public.trip_commissions`, o gatilho `trip_commissions_calc_trigger` é ativado.
2. **Apuração do Faturamento Mensal**: O gatilho localiza o mês de embarque da viagem (`travel_start`) e realiza a soma acumulada de todas as bases comissionáveis das outras viagens fechadas do mesmo agente naquele mês.
3. **Resolução de Alíquotas**:
   - **Regra Customizada**: Busca a regra do vendedor em `public.agent_commission_rules`. Se for do tipo `fixed`, aplica a taxa percentual fixa. Se for `scale`, decodifica o JSONB de faixas (`scale_ranges`) para obter a taxa marginal do faturamento total acumulado.
   - **Regra Fallback**: Se o vendedor não possuir regra parametrizada, o sistema adota:
     - Faturamento $\ge \text{R\$ 100.000,00} \rightarrow 7\%$
     - Faturamento $\ge \text{R\$ 50.000,00} \rightarrow 5\%$
     - Faturamento $< \text{R\$ 50.000,00} \rightarrow 3\%$
4. **Persistência**: Grava `agent_commission_brl` e `net_profit` de forma denormalizada na tabela `trip_commissions`.

---

## 2. Gaps Críticos e Desvios de Negócio

### 2.1 Ausência de Participação de Over

- **Problema**: O PRD estabelece que o agente recebe comissão baseada na base líquida elegível + **participação de over líquido** (geralmente 30% ou configurável).
- **Estado Atual**: A tabela `trip_commissions` e a trigger de cálculo desconsideram totalmente o conceito de `over_bruto`, `over_liquido` e taxas retidas de operadoras sobre o over.
- **Correção**: Implementar as colunas de over e a regra de rateio configurável na tabela de regras e no cálculo do banco.

### 2.2 Inexistência de Ajustes, Estornos e Adiantamentos

- **Problema**: O agente pode sofrer descontos decorrentes de erros operacionais imputados, brindes entregues a clientes, chargebacks de cartões ou receber incentivos sazonais e adiantamentos.
- **Estado Atual**: Não há suporte para tabela de lançamentos de ajustes (`seller_adjustments`), impedindo que o financeiro registre lançamentos não operacionais ou estornos de parcelas inadimplentes.
- **Correção**: Criar a tabela `seller_adjustments` de forma a alimentar o extrato consolidado do fechamento do agente.

### 2.3 Falta de Workflow de Aprovação e Fechamento de Extrato

- **Problema**: O fechamento mensal de comissão hoje é dinâmico. Se uma viagem de dois meses atrás for alterada, o faturamento daquele mês muda retroativamente, alterando a comissão do agente retroativamente de forma silenciosa.
- **Estado Atual**: Não existe histórico de snapshots de regras ou fechamentos bloqueados. Se as faixas mudarem ou se novas vendas forem imputadas retroativamente, as comissões passadas mudam.
- **Correção**: Adotar tabelas de períodos de fechamento mensal (`monthly_closing_periods`) com bloqueio de escrita e snapshot imutável da folha de pagamento do agente.
