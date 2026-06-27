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
- `status`: `proposal_status` (Enum: `draft`, `sent`, `accepted`, `declined`, `expired`)
- **Componentes em formato JSONB**:
  - `flights`, `hotels`, `transfers`, `tours`, `itinerary`, `includes`, `excludes`, `insurance`

---

## 2. Tabelas do Motor Inteligente VibeTour (Fase Core Aplicada)

As seguintes tabelas foram implementadas e mapeadas em `types.ts`:

- **`quote_requests`**: Armazena as intenções de viagem normalizadas (`normalized_intent`) capturadas da IA.
- **`quote_travelers`**: Armazena os passageiros e faixas etárias associados à cotação.
- **`quote_preferences`**: Parâmetros de preferência do cliente (filtros rígidos vs. soft constraints).
- **`quote_search_plans` / `quote_scenarios`**: Versionamento e listagem de cenários concorrentes de busca.
- **`quote_raw_results`**: Cache de buscas temporárias dos provedores.
- **`normalized_offers`**: Detalhes normalizados de passagens aéreas, hotéis, traslados e passeios.
- **`package_candidates` / `package_candidate_components`**: Combinações de componentes que formam um pacote cotado.
- **`package_scorecards`**: Detalhamento matemático de bônus, penalidades e nota final do candidato.
- **`score_profiles`**: Definição de pesos das dimensões de conforto, logística e custo-benefício.
- **`simulation_runs` / `simulation_results`**: Histórico e resultados de simulações com personas.

---

## 3. Relações Canônicas

- **proposals → leads**: Uma cotação pode nascer a partir de uma oportunidade de venda (`lead_id`) no CRM do TravelOS.
- **proposals → clients**: Uma proposta aceita vincula-se ao cadastro oficial do cliente (`client_id`).
- **proposals → trips**: Quando o status muda para `accepted`, uma trigger/RPC cria a viagem correspondente em `trips` associando todos os passageiros.

---

## 4. Classificação e Lacunas estruturais

- **Tabelas Operacionais do Core**: **REAL PONTA A PONTA**. Todas as tabelas descritas no item 2 estão físicas e integradas ao ORM.
- **Versionamento de Propostas**: **Incompleto**. Não há rastreabilidade física de versões anteriores da mesma cotação caso o agente modifique as informações (sobrescreve os campos).
- **Learning & Rules**: **Ausente**. As tabelas de aprendizado (`decision_rules`, `decision_records`, `rule_candidates`) ainda não existem no banco de dados.
