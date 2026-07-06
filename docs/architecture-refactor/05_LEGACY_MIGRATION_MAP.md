# Plano de Migração e Estratégia Strangler

Este documento detalha o mapa de migração gradual dos módulos legados (monolíticos) para a arquitetura modular canônica do TravelAgencias/Turis, mitigando riscos de regressão visual ou quebra de fluxos em produção.

---

## 🏗️ Estratégia Strangler (Estrangulamento de Código)

Para evitar reescritas "big-bang" que costumam introduzir bugs em cascata, utilizaremos a **Estratégia Strangler**:

1. Criar o novo módulo na pasta canônica `src/modules/`.
2. Definir contratos rígidos (interfaces TypeScript) para as APIs públicas do novo módulo.
3. Criar uma camada de adaptação (Adapter) que traduz dados das tabelas legadas para o novo formato, se necessário.
4. Redirecionar os consumidores aos poucos (ex: migrar primeiro o portal do cliente, depois a área administrativa).
5. Desativar o código legado somente após o número de chamadores ativos atingir **zero**.

---

## 🗺️ Mapa de Migração de Módulos

A tabela a seguir orienta as etapas de reestruturação física e lógica dos domínios:

| Módulo Legado (Arquivo/Pasta)                                 | Substituto Canônico (Módulo)                         | Adapter / Interface                              | Consumidores Ativos                     | Status da Migração | Critério de Remoção Segura                                                |
| ------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | --------------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `src/routes/agency.$slug.rooming-list.tsx`                    | `src/modules/groups/components/RoomingListDashboard` | `src/modules/groups/types/index.ts`              | Barra lateral (Sidebar), links internos | Planejado          | Redirecionamento de rotas verificado e testes DndKit executados sem erro. |
| Timelines e Timestamps no CRM `agency.$slug.crm.$lead_id.tsx` | `src/modules/crm/components/LeadTimeline`            | `src/modules/crm/services/timeline.ts`           | Detalhe do Lead                         | Planejado          | Componentes internos isolados e carregados via lazy import.               |
| PDF/Excel Exporters em `src/lib/exportRoomingList.ts`         | `src/client/export/`                                 | `exportRoomingList.ts` (API pública encapsulada) | Rooming List, Excursões                 | Planejado          | Sem imports estáticos de bibliotecas pesadas no bundle primário.          |
| Roteiro de Viagens e Snapshots no Portal do Cliente           | `src/modules/portal/`                                | `src/modules/portal/queries/rooming.ts`          | Portal `client.trips.$id.tsx`           | Planejado          | RLS ativada e consultas restritas via `get_my_room_allocation` validadas. |

---

## 🧪 Testes de Caracterização para Validação

Antes de iniciar a migração de qualquer um dos módulos listados acima, o arquiteto deve assegurar que:

1. **Contrato de Tipos**: Os novos schemas Zod e interfaces TypeScript cubram 100% dos campos armazenados na tabela do banco de dados (especialmente colunas JSONB).
2. **Preservação de IDs**: A migração de fluxos deve manter a referência de IDs de chaves estrangeiras (ex: `group_tour_id` e `client_id`).
3. **Segurança Multi-tenant**: Todas as consultas do novo módulo devem obrigatoriamente exigir `agency_id` como filtro de entrada nas queries ou garantir que políticas RLS estejam ativas para o usuário autenticado.
