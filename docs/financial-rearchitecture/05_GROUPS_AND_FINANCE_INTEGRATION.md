# Integração Financeira de Grupos e Excursões (TravelOS)

Este relatório detalha a arquitetura de vinculação entre o Hub de Grupos (Excursões) e o Subsistema Financeiro no TravelOS, auditando a consolidação de custos fixos, variáveis e orçamentos.

---

## 1. Modelo de Integração Existente
O módulo de Grupos e Excursões (`group_tours`) está integrado financeiramente por três vias principais:

1. **Receita Econômica (Inscrições de Viajantes)**:
   * Cada venda ou inscrição gera uma viagem (`public.trips`) associada à agência e com a chave `group_tour_id` apontando para o grupo de origem.
   * A receita realizada do grupo é calculada somando todas as entradas confirmadas (`financial_records` do tipo `income` e status `paid`) cujas viagens individuais apontem para aquele grupo (`trips.group_tour_id = group_tours.id`).
2. **Custos Operacionais do Grupo (`group_tour_costs`)**:
   * Custos são tipados em **Fixos** (independentes do número de passageiros, como frete de ônibus, contratação de guias locais) e **Variáveis** (calculados por passageiro confirmado, como diárias de hotéis, ingressos ou refeições).
   * O custo operacional total consolidado é calculado no frontend como:
     $$\text{Custo Total} = \sum \text{Custo Fixo} + (\sum \text{Custo Variável} \times \text{Pax Conf}) + \text{Ads Budget}$$
3. **Fundo Terrestre / Poupança Retida**:
   * O campo `target_poupanca_balance` representa a poupança forçada retida pela agência para cobrir contingências ou amortizar custos futuros da frota rodoviária.

---

## 2. Gaps Técnicos Auditados

### 2.1 Cálculo de Rentabilidade Feito no Frontend
* **Problema**: O cálculo de custos totais, receita realizada, margem líquida e ROI de cada grupo de viagens é feito inteiramente em tempo de execução no lado do cliente (`GroupFinancialsDashboard` do React).
* **Impacto**: O carregamento de centenas de registros de inscrições e custos sobrecarrega o navegador, além de impedir o uso desse indicador em relatórios consolidados gerados em background no servidor.
* **Correção**: Implementar uma RPC de banco de dados (`public.calculate_group_financials(_group_tour_id uuid)`) ou views materializadas que retornem os consolidados pré-calculados de forma otimizada.

### 2.2 Vinculação Indireta de Despesas de Fornecedores
* **Problema**: Custos de fornecedores cadastrados na tabela de custos (`group_tour_costs`) não geram lançamentos em `financial_records` nem são rastreados no contas a pagar de forma automática.
* **Impacto**: A agência pode aprovar uma despesa na excursão, mas o financeiro geral da empresa não recebe o boleto correspondente no contas a pagar, levando a falhas de fluxo de caixa.
* **Correção**: Adicionar uma trigger ou fluxo operacional que converta automaticamente despesas aprovadas de grupos em registros de contas a pagar (`financial_records` com `type = 'expense'`).
