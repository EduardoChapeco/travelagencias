# 01. Código Morto, Legado e Duplicado - TravelOS

Este documento identifica duplicações de fontes de verdade, arquivos órfãos sem consumo no frontend, stubs e arquivos monolíticos que violam o princípio de responsabilidade única.

---

## 1. Duplicações de Fontes de Verdade (Split Brain)

### 1.1 Rooming Lists (Lista de Quartos)
* **Duplicidade:**
  1. `group_tours.rooming_list`: Coluna desnormalizada (JSONB) no banco, atualizada de forma inline no formulário de grupos em `/agency/$slug/group-tours/$id`.
  2. `boarding_rooming_list`: Tabela relacional normalizada (`boarding_rooming_list`) com RLS, alimentada pelo service `RoomingService` (`src/services/rooming.ts`).
* **Problema:** Se o agente alocar quartos em um local, as alterações não se propagam para o outro. Isto causa inconsistências visuais e riscos de sobresscrever dados válidos do cliente.
* **Ação:** Desativar a coluna JSONB `group_tours.rooming_list` após migrar os dados legados para a tabela relacional `boarding_rooming_list` e reescrever o painel de grupos para usar a tabela relacional normalizada.

### 1.2 Malha Aérea vs. Bilhetes de Embarque
* **Duplicidade:**
  1. `flight_itineraries` + `flight_segments`: Tabelas normalizadas que controlam o itinerário aéreo corporativo da viagem e suas alterações/versões (aba "Aéreos").
  2. `boarding_tickets` (tipo = `flight`): Registros planos na tabela de bilhetes (exibidos na aba "Bilhetes de Embarque").
* **Problema:** Os bilhetes e trechos não são sincronizados automaticamente. Se o agente atualiza e confirma um novo voo na aba "Aéreos", o passageiro continua visualizando PNRs e trechos desatualizados na aba "Bilhetes de Embarque".
* **Ação:** Criar um trigger no Postgres que atualize automaticamente os `boarding_tickets` quando um itinerário corporativo em `flight_itineraries` for promovido ao status `confirmed`.

---

## 2. Componentes Monolíticos e Complexos

Os arquivos abaixo concentram lógica excessiva e representam gargalos de legibilidade e performance:

| Arquivo | Localização | Linhas | Problema | Ação Sugerida |
| :--- | :--- | ---: | :--- | :--- |
| [client.trips.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/client.trips.$id.tsx) | `src/routes/client.trips.$id.tsx` | ~1.906 | Gerencia todas as sub-abas do portal do cliente (localizadores, hotéis, tickets, uploads, e-mails) de forma síncrona. | Fatiar em componentes isolados (ex: `LodgingTab`, `FlightsTab`, `SupportChat`) na pasta `src/components/portal/`. |
| [group-tours.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.$id.tsx) | `src/routes/agency.$slug.group-tours.$id.tsx` | ~620 | Mistura formulário de edição de grupos, lista de passageiros inscritos, mapa de assentos e rooming list. | Mover o editor de mapa de assentos (ônibus virtual) para `src/components/group-tours/SeatMapEditor.tsx`. |
| [crm.$lead_id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.crm.$lead_id.tsx) | `src/routes/agency.$slug.crm.$lead_id.tsx` | ~620 | Acopla todo o histórico de interações do lead e formulários de atividades. | Extrair os renderizadores de atividades para `src/components/crm/LeadActivityFeed.tsx`. |
| [VoucherStudio.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/vouchers/VoucherStudio.tsx) | `src/components/vouchers/VoucherStudio.tsx` | ~800 | Gerencia configuração visual, manipulação de cores do Brand Kit e exportação em PDF. | Dividir a lógica do Studio em `VoucherSidebarControls` e `VoucherSandboxCanvas`. |

---

## 3. Elementos Órfãos (Sem Uso Real)

### 3.1 Arquivos e Roteiros Não Consumidos
* **Página de Destination Intelligence (`destination-intelligence.tsx`)**: O banco possui a tabela `destination_info` e a página administrativa no admin para gerar e revisar dicas, mas o frontend do passageiro (portal `/client/trips/$id` ou check-in móvel) não consome essa informação em nenhuma rota.

### 3.2 Scratch Scripts
* Os scripts de scratch como `scratch/apply_migration_e.cjs`, `scratch/check_db.cjs` e `scratch/run_gen_types.cjs` são ferramentas locais de utilidade temporária do agente e devem ser movidos ou documentados como utilidades de infraestrutura, mantendo-os fora do bundle de produção do app.
