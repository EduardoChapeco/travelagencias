# 05. Auditoria de Banco, RLS e Migrations

Este documento apresenta a auditoria forense do banco de dados do Supabase, analisando tabelas reais, versionamento de migrations, integridade referencial e políticas de RLS (Row Level Security).

---

## 1. Inventário de Tabelas Operacionais Auditadas

Utilizando verificação direta no banco de dados remoto da produção (`esmppoxxnyiscidzsjvy`), confirmamos a presença e conformidade das seguintes tabelas:

| Nome da Tabela            | Chave Primária (PK) | Chave Estrangeira (FK)           | RLS Ativo? | Índices Críticos | Soft Delete (`deleted_at`) | Risco de Integridade                                                                       |
| :------------------------ | :------------------ | :------------------------------- | :--------- | :--------------- | :------------------------- | :----------------------------------------------------------------------------------------- |
| `trips`                   | `id` (uuid)         | `client_id`, `assigned_agent_id` | Sim        | Sim (em Fks)     | Sim                        | Baixo. Colunas de controle de ciclo de vida ativas.                                        |
| `supplier_products`       | `id` (uuid)         | `supplier_id` (uuid)             | Sim        | Sim (em Fks)     | Não                        | Baixo. Tabela normalizada ativa no catálogo de produtos.                                   |
| `supplier_contacts`       | `id` (uuid)         | `supplier_id` (uuid)             | Sim        | Sim (em Fks)     | Não                        | Baixo. Suporta múltiplos contatos por fornecedor.                                          |
| `supplier_files`          | `id` (uuid)         | `supplier_id` (uuid)             | Sim        | Sim (em Fks)     | Não                        | Baixo. Guarda o metadado estruturado do OCR.                                               |
| `boarding_tickets`        | `id` (uuid)         | `card_id` (uuid)                 | Sim        | Sim (em Fks)     | Não                        | Médio. Tabela guarda bilhetes aéreos e ingressos. Relação com `boarding_cards` forte.      |
| `boarding_rooming_list`   | `id` (uuid)         | `card_id` (uuid)                 | Sim        | Sim              | Não                        | Alto. Existe em paralelo com o campo legando `rooming_list` JSONB na tabela `group_tours`. |
| `contract_clauses`        | `id` (uuid)         | `agency_id` (uuid)               | Sim        | Sim              | Não                        | Baixo. Semeado com cláusulas jurídicas padrão.                                             |
| `destination_info`        | `id` (uuid)         | —                                | Sim        | Sim              | Não                        | Baixo. Consumido com filtro de revisão manual (`reviewed_at`).                             |
| `flight_itineraries`      | `id` (uuid)         | `trip_id` (uuid)                 | Sim        | Sim (em Fks)     | Não                        | Baixo. Armazena versões de cabeçalhos de malha de voo.                                     |
| `flight_segments`         | `id` (uuid)         | `itinerary_id` (uuid)            | Sim        | Sim (em Fks)     | Não                        | Baixo. Armazena segmentos físicos vinculados à versão.                                     |
| `trip_confirmation_items` | `id` (uuid)         | `trip_id` (uuid)                 | Sim        | Sim (em Fks)     | Não                        | Baixo. Tabela normalizada para localizadores de serviços.                                  |

---

## 2. Inconsistência de Versionamento de Migrations

Detectamos uma lacuna no controle de código-fonte das migrations:

- As migrations locais `20260624000001_trip_confirmation_items.sql`, `20260624000002_boarding_cards_hotel_stars.sql`, `20260624000003_flight_reconciliation_schema.sql` e `20260624000004_client_view_policies.sql` constam como **não rastreadas (untracked)** no Git local.
- No entanto, a verificação física no banco Supabase remoto confirma que as tabelas criadas por estas migrations (`trip_confirmation_items`, `flight_itineraries`, `flight_segments`) **já existem em produção**.
- **Implicação:** O banco de produção foi atualizado (provavelmente via execução local de comandos Supabase CLI ou aplicação direta), mas o versionamento do Git ficou desalinhado. Essas migrations precisam ser commitadas imediatamente para garantir a sanidade da CI/CD.

---

## 3. Análise de RLS (Row Level Security) e Isolamento Multi-Tenant

- **Políticas de Agências e Membros:** Todas as novas tabelas (`supplier_products`, `supplier_contacts`, `supplier_files`, `boarding_tickets`, `contract_clauses`, `flight_itineraries`, `trip_confirmation_items`) possuem cláusulas `USING` e `WITH CHECK` que filtram o acesso do usuário autenticado validando seu pertencimento ao tenant na tabela `public.agency_members`.
  - _Exemplo da política:_
    ```sql
    USING (agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    ))
    ```
- **Políticas de Clientes (Portal do Passageiro B2C):**
  - A migration local untracked `20260624000004_client_view_policies.sql` adicionou as políticas que permitem que clientes visualizem seus próprios itinerários de voo, segmentos e confirmações de reserva baseando-se no `client_id` associado ao `auth.uid()`.
  - **Risco Identificado:** Se esta migration específica de políticas de clientes não tiver sido rodada na produção, o portal do cliente móvel (`/client/trips/$id`) falhará silenciosamente com erros de permissão de RLS ao tentar renderizar os widgets de localizadores e voos para os usuários finais.

---

## 4. Riscos de Concorrência e Integridade de Dados

- **O Problema da Rooming List Duplicada:**
  - O sistema possui a tabela normalizada `boarding_rooming_list` com RLS e registros isolados. O componente `RoomingList.tsx` manipula esta tabela.
  - No entanto, a tabela `group_tours` possui a coluna `rooming_list` tipo JSONB, que é atualizada síncronamente pela rota de grupos (`group-tours.$id.tsx`).
  - **Risco Técnico:** A presença de duas fontes de verdade para alocação de quartos pode gerar inconsistências graves em excursões de grupos: o agente pode atualizar o quarto via view de embarque (escrevendo na tabela normalizada) e outro agente pode atualizar via view de grupos (sobrescrevendo o JSONB inteiro e apagando as alterações).
