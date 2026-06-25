# Auditoria de Lógica de Negócio e Cálculos

Este documento audita a consistência matemática das fórmulas financeiras, regras de scoring e mecanismos de concorrência e idempotência aplicados no Motor VibeTour.

---

## 1. Integridade de Fórmulas Financeiras e Pricing

As alternativas de pacotes consolidam ofertas e realizam divisões de valores através do seguinte modelo (`src/services/quotes.ts`):

```typescript
const totalPrice = offers.reduce((acc, curr) => acc + Number(curr.price_total), 0);
```

### 1.1. Distribuição de Pricing (`PriceBreakdown`)
O contrato canônico estabelece:
* `netPrice`: Custo puro do fornecedor.
* `commission`: Comissão da agência.
* `markup`: Margem de lucro adicionada pela agência.
* `taxes`: Taxas de embarque/serviço.
* `totalPrice`: Valor final de venda (`netPrice + commission + markup + taxes`).

### 1.2. Riscos de Divergência de Arredondamento
* **Audit**: O cálculo de preços é feito em Javascript utilizando o tipo primitivo `Number` e arredondado na UI com formatação local (`toLocaleString`).
* **Risco**: Erros de ponto flutuante cumulativos podem gerar divergência de centavos no somatório do pacote em relação à soma das parcelas individuais mostradas nas tabelas de ofertas.
* **Recomendação**: Centralizar a consolidação e arredondamento financeiro no banco de dados (Postgres) ou utilizar inteiros (centavos) para representar os valores monetários em trânsito.

---

## 2. Idempotência e Duplo Clique

### 2.1. Criação de Proposta de Venda
* Na tela de detalhe (`src/routes/agency.$slug.quotes.$id.tsx`), a ação de converter alternativa em proposta é acionada por `convertMut.mutate`.
* **Gap**: O botão de conversão não é desabilitado fisicamente no primeiro clique caso a transação leve tempo, permitindo cliques repetidos do agente.
* **Consequência**: Criação de propostas duplicadas com UUIDs diferentes associadas à mesma cotação, poluindo a base de dados comercial.
* **Correção**: Bloquear a interação definindo a propriedade `disabled={converting !== null}` e adicionando spinners de loading.

### 2.2. Execução de Pesquisas GDS
* O status do cenário é alterado de forma atômica para `processing` no início da chamada, o que evita buscas concorrentes repetidas para o mesmo cenário de busca enquanto uma transação estiver pendente.
