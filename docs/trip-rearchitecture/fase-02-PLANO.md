# Fase 2 — Trip Aggregate: Schema e Services

**Status:** PLANEJADO (Aguardando Aprovação)  
**Critério de pronto:** Migração SQL criada, types.ts atualizado, services `trip-aggregate.ts` e `rooming.ts` criados, typecheck e build passando.

## Alterações de Banco (Migration SQL)

Criar a migração `supabase/migrations/20260624000000_trip_lifecycle_extensions.sql` contendo:

- Coluna `trip_type` (individual | group | corporate) em `trips` com valor padrão `individual`.
- Coluna `lifecycle_status` em `trips` com valor padrão `draft`.
- Coluna `group_tour_id` em `trips` como chave estrangeira de `group_tours(id)`.
- Coluna `booking_reference` em `trips` (localizador global da reserva consolidada).
- Coluna `assigned_agent_id` em `trips` vinculada a `auth.users(id)`.
- Coluna `portal_enabled` (boolean) em `trips` com padrão `true`.
- Índices de performance para `lifecycle_status` e `trip_type` filtrando por `agency_id`.

## Tipagens (types.ts)

Atualizar manualmente as definições de tipo da tabela `trips` no arquivo [types.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/integrations/supabase/types.ts) para refletir os novos campos em `Row`, `Insert` e `Update`.

## Novos Serviços

1. **Trip Aggregate Service (`src/services/trip-aggregate.ts`)**:
   - Abstração central para queries da Viagem e seus agregados.
   - Fornece queries unificadas que combinam dados básicos da viagem com seus passageiros, pagamentos, bilhetes aéreos de embarque, etc.
   - Evita queries SQL complexas inline no frontend.

2. **Rooming List Service (`src/services/rooming.ts`)**:
   - Abstrai a lógica de manipulação e persistência de dados de alocação de quartos para grupos.
   - Fornece funções para criar quartos, alocar/desalocar passageiros, e ler ocupações usando tanto a estrutura atual quanto preparando para futuras tabelas.

## Compatibilidade

- O campo `status` original da tabela `trips` (tipo enum `trip_status` com valores `planning`, `confirmed`, `in_progress`, `completed`, `cancelled`) é preservado e sincronizado com `lifecycle_status` no frontend/backend para retrocompatibilidade.
- A chave estrangeira `group_tour_id` permite que viagens individuais façam parte de uma excursão em grupo e usem o Rooming List herdado.
