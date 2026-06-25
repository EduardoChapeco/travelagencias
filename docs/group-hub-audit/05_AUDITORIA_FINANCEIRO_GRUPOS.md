# 05. Auditoria do Financeiro de Grupos Unificado

## 1. Mapeamento de Métricas e Fórmulas de KPIs

| KPI                         | Fórmula no Código                                                                   | Tabelas Utilizadas                      | Filtros Aplicados                                | Moeda | Status Real                   | Teste Realizado                                                                                                                                                                                 |
| :-------------------------- | :---------------------------------------------------------------------------------- | :-------------------------------------- | :----------------------------------------------- | :---: | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faturamento Total**       | `SUM(enrollment.total_paid \|\| tour.base_price)` para inscrições confirmadas.      | `group_tour_enrollments`, `group_tours` | `agency_id = agency.id`, `status = 'confirmed'`  |  BRL  | **REAL COM DESVIO DE REGIME** | Regime híbrido: se o pagamento foi parcial ou nulo, o cálculo assume o `base_price` (regime de competência presumida), inflando o caixa antes do recebimento real.                              |
| **Custos Operacionais**     | `SUM(cost.amount[fixed] + ads_budget) + SUM(cost.amount[variable] * confirmed_pax)` | `group_tour_costs`, `group_tours`       | `agency_id = agency.id`                          |  BRL  | **REAL COM RISCO DE ESCALA**  | Risco de cálculo: Assume que custos variáveis são unitários por pax. Se o operador cadastrar um custo consolidado como variável, o valor é multiplicado indevidamente por todos os passageiros. |
| **Resultado Líquido**       | `Faturamento Total - Custos Operacionais`                                           | Calculado no frontend                   | Calculado no frontend                            |  BRL  | **REAL**                      | Sim, subtração aritmética simples.                                                                                                                                                              |
| **Poupança Retida (Vault)** | `SUM(tour.target_poupanca_balance)`                                                 | `group_tours`                           | `agency_id = agency.id`, `status != 'cancelled'` |  BRL  | **REAL**                      | Sim, soma simples do campo de poupança dos grupos ativos.                                                                                                                                       |
| **Verba de Ads (Mkt)**      | `SUM(tour.ads_budget)`                                                              | `group_tours`                           | `agency_id = agency.id`, `status != 'cancelled'` |  BRL  | **REAL**                      | Sim, soma simples dos orçamentos de tráfego.                                                                                                                                                    |

---

## 2. Divergências de Integridade e Sincronização

### O Problema do Regime Financeiro

O cálculo de faturamento em `GroupFinancialsDashboard` utiliza:

```typescript
const revenue = tourEnrols
  .filter((e) => e.status === "confirmed")
  .reduce((sum, e) => sum + (e.total_paid || t.base_price), 0);
```

Isso gera graves distorções:

1. Se o cliente pagou apenas um sinal (sinal de Pix de R$ 100 em uma viagem de R$ 1.000) e a inscrição foi aprovada, e o campo `total_paid` na tabela `group_tour_enrollments` ficou preenchido como R$ 100, o faturamento do grupo contabilizará apenas R$ 100.
2. Contudo, se o cliente ainda não realizou o pagamento inicial (mas a inscrição está confirmada operacionalmente com `total_paid` nulo ou zero), a fórmula assume `t.base_price` completo (R$ 1.000), inflando artificialmente a receita corrente.

### Dessincronização do Fluxo de Caixa (Ledger vs. Projeções)

Há uma desconexão entre as tabelas `group_tour_enrollments`, `payment_installments` e `financial_records`:

- **Aprovação**: No momento da aprovação da inscrição, o sistema grava o sinal pago em `group_tour_enrollments.total_paid` e cria o carnê de parcelas.
- **Pagamentos Posteriores**: Quando o cliente paga a 2ª ou 3ª parcela do carnê pelo portal ou pelo caixa geral da agência, o sistema registra a baixa na tabela `payment_installments` e insere um registro em `financial_records`.
- **Dessincronização**: **Nenhuma** dessas baixas atualiza o campo `total_paid` da tabela `group_tour_enrollments`.
- **Consequência**: O dashboard financeiro de grupos continuará exibindo o faturamento baseado no valor inicial gravado na inscrição, ignorando todas as parcelas subsequentes pagas pelo cliente. A receita real acumulada fica permanentemente defasada em relação ao caixa real da agência.

### Poluição do Extrato Financeiro

A query do extrato de transações de grupos em `GroupFinancialsDashboard` é estruturada da seguinte forma:

```typescript
const { data, error } = await supabase
  .from("financial_records")
  .select(
    "id, amount, type, payment_method, notes, created_at, trips!inner(id, title, group_tour_id)",
  );
```

- **Erro**: O filtro `trips!inner` garante apenas que a transação esteja associada a uma viagem que exista. Ele **não filtra** se a viagem possui `group_tour_id IS NOT NULL`.
- **Impacto**: O extrato exibirá lançamentos financeiros de viagens individuais e avulsas de clientes que não pertencem a nenhuma excursão em grupo, desde que a transação esteja vinculada a uma viagem cadastrada. Isso polui completamente o extrato específico do hub de grupos com dados financeiros gerais da agência.
