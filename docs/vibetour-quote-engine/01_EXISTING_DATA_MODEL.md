# 01. Modelo de Dados Existente (Existing Data Model)

Este documento analisa as estruturas das tabelas relacionais do banco de dados local que interagem com o fluxo de cotações e propostas.

---

## 1. Estrutura da Tabela `public.proposals`

Derivada da definição estática do Supabase, a tabela canônica `proposals` possui a seguinte estrutura:

- `id`: `UUID` (Chave Primária)
- `number`: `BIGINT` (Autoincremento incremental por agência)
- `agency_id`: `UUID` (Vínculo multitenant com `agencies`)
- `client_id`: `UUID` (Vínculo opcional com `clients`)
- `lead_id`: `UUID` (Vínculo opcional com `leads` no CRM)
- `title`: `TEXT` (Título descritivo da cotação/proposta)
- `destination`: `TEXT` (Cidade/País de destino principal)
- `travel_start`: `DATE` (Início da viagem)
- `travel_end`: `DATE` (Término da viagem)
- `currency`: `TEXT` (Moeda, padrão `BRL`)
- `subtotal`: `NUMERIC` (Soma dos componentes brutos)
- `discount`: `NUMERIC` (Descontos aplicados)
- `total`: `NUMERIC` (Valor final de faturamento)
- `pix_discount_percent`: `NUMERIC` (Desconto condicional para pagamento via PIX)
- `installments_card`: `INTEGER` (Máximo de parcelas no cartão)
- `installments_boleto`: `INTEGER` (Máximo de parcelas no boleto)
- `status`: `proposal_status` (Enum: `draft`, `sent`, `accepted`, `declined`, `expired`)
- **Componentes em formato JSONB**:
  - `flights`: JSON contendo a lista de trechos aéreos (companhia, voo, origem, destino, datas, bagagem, preço).
  - `hotels`: JSON contendo acomodações (nome, check-in, check-out, regime, quartos, preço).
  - `transfers`: JSON contendo serviços de traslados (veículo, datas, tipo, preço).
  - `tours`: JSON contendo passeios locais (passeio, datas, comissão, preço).
  - `itinerary`: JSON contendo o cronograma diário da viagem.
  - `includes`/`excludes`: Arrays de texto com o que está incluso/excluso na tarifa.
  - `insurance`: JSON com as apólices e coberturas contratadas.

---

## 2. Relações Canônicas

- **proposals → leads**: Uma cotação pode nascer a partir de uma oportunidade de venda (`lead_id`) no CRM do TravelOS.
- **proposals → clients**: Uma proposta aceita vincula-se ao cadastro oficial do cliente (`client_id`).
- **proposals → trips**: Quando o status muda para `accepted`, uma trigger/RPC cria a viagem correspondente em `trips` associando todos os passageiros.

---

## 3. Classificação e Lacunas estruturais

- **Tabela de Cotações Avançadas/Cenários**: **Ausente**. Não existem tabelas como `quote_requests`, `quote_scenarios`, ou `normalized_offers`.
- **Versionamento**: **Incompleto**. Não há rastreabilidade física de versões anteriores da mesma cotação caso o agente modifique as informações (sobrescreve os campos).
