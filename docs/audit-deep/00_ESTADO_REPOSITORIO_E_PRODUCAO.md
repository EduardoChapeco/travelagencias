# 00. Estado Real do Repositório e de Produção

**Data da Auditoria:** 19 de Junho de 2026  
**Auditor Técnico Forense:** Antigravity AI  
**Escopo:** Mapeamento do estado atual do Git (local vs remoto) e ambiente de produção (Cloudflare + Supabase)

---

## 1. Informações Básicas do Git

- **Branch Local Ativa:** `main` (rastreando `origin/main`).
- **HEAD atual:** `d5584e515bfb1a12ef47710d71b6303e185ebade` (_"migration: add trip lifecycle and aggregation fields to public.trips"_).
- **Branch Remota:** `origin/main` (atualizada com HEAD).
- **Divergências Git:** O diretório local de trabalho está sujo com modificações não commitadas e arquivos não rastreados que contêm as lógicas das fases implementadas nesta sessão.

---

## 2. Linha do Tempo e commits Recentes (Últimos 10)

| ID do Commit | Data / Autor         | Descrição                                                                                                                                                                          | Arquivos Relevantes                                                                                             | Evidência / Observação                                                      |
| :----------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `d5584e5`    | 2026-06-19 / Eduardo | `migration: add trip lifecycle and aggregation fields to public.trips`                                                                                                             | `supabase/migrations/20260624000000_trip_lifecycle_extensions.sql`                                              | Migration de suporte ao novo ciclo de vida da viagem (Fase 2).              |
| `5a26234`    | 2026-06-19 / Eduardo | `feat(trip-rearchitecture): implement Phase 1 - Navigation Architecture (sidebar & trip sub-routes)`                                                                               | `AppSidebar.tsx`, `trips.$id.tsx`, sub-rotas stubs (`flights`, `confirmation`, `destination`, `boarding`, etc.) | Layout de navegação reestruturado com 11 abas contextuais.                  |
| `c3df8b8`    | 2026-06-18 / Eduardo | `feat: implement post-audit PRD phases (OCR, suppliers autocomplete, contract clause library, check-in portal, rooming list, destination intelligence, and flight reconciliation)` | Múltiplos arquivos (OCR, autocomplete, clause library, etc.)                                                    | Commit massivo com implementações parciais e completas pós-auditoria.       |
| `e64dfba`    | 2026-06-18 / Eduardo | `feat(voucher): dynamic brand kit propagation, A4 template company info footer & responsive canvas layout`                                                                         | `VoucherStudio.tsx`, `ExportPdfButton.tsx`                                                                      | Ajustes visuais no VoucherStudio para remover shadows e suportar brand kit. |
| `8a6ed46`    | 2026-06-17 / Eduardo | `feat: responsiveness fixes for sidebar and app shell`                                                                                                                             | `AppShell.tsx`, `SlimSidebar.tsx`                                                                               | Ajustes de compressão nas laterais de resoluções menores.                   |
| `86ea764`    | 2026-06-17 / Eduardo | `feat(builder): Phase 3+4 complete - IframeSandbox viewport simulation, grouped block library...`                                                                                  | Módulos do CMS Portal                                                                                           | Melhorias no construtor visual do site.                                     |
| `e37231e`    | 2026-06-17 / Eduardo | `fix: resolve conflicting migration timestamps with remote schema`                                                                                                                 | `supabase/migrations`                                                                                           | Resolução de conflitos de migração.                                         |
| `b7363a5`    | 2026-06-17 / Eduardo | `feat: conciliacao diaria de recibos, comprovantes recorrentes, segmentacao de passageiros...`                                                                                     | Módulos financeiros e de passageiros                                                                            | Início do redesign Light Editorial e novas sidebar.                         |
| `e9fb695`    | 2026-06-17 / Eduardo | `design(onboarding-landing): redesign login, register and landing page to Light Editorial SaaS`                                                                                    | `auth.login.tsx`, `index.tsx`, `styles.css`                                                                     | Redesign completo das páginas públicas.                                     |
| `6e27f67`    | 2026-06-17 / Eduardo | `style(design-system): standardize layouts, sheets scroll, and flatten all shadow classes`                                                                                         | Múltiplos componentes                                                                                           | Higienização de sombras utilitárias.                                        |

---

## 3. Estado das Modificações Locais (Não Commitadas)

### 3.1 Arquivos Modificados (Dirty State)

- `src/integrations/supabase/types.ts`: Atualizado com os schemas de tabelas locais.
- `src/routes/agency.$slug.trips.$id.confirmation.tsx`: Implementação real do painel de controle e listagem de localizadores.
- `src/routes/agency.$slug.trips.$id.flights.tsx`: Implementação da aba de Aéreos, versionamento de itinerários e diff engine.
- `src/routes/agency.$slug.trips.$id.history.tsx`: Implementação da aba de histórico/auditoria consolidado (audit_log + boarding activities).
- `src/routes/agency.$slug.trips.$id.lodging.tsx`: Implementação real da aba de Hospedagem conectada a `boarding_cards`.
- `src/routes/client.trips.$id.tsx`: Widget de localizadores e widget de destino integrados e renderizados.
- `supabase/migrations/20260619000001_boarding_rooming_list.sql`: Ajuste de migration.

### 3.2 Arquivos Não Rastreados (Untracked)

- `src/services/trip-aggregate.ts`: Agregador de dados de Viagem.
- `src/services/trip-confirmation.ts`: CRUD e verificações de confirmação de reservas.
- `src/services/flight-reconciliation.ts`: Controle de itinerários, segmentos e motor de diff de voos.
- `src/services/rooming.ts`: Abstração de alocação de quartos.
- `src/services/audit.ts`: Gravação de trilha de auditoria na tabela `audit_log`.
- `supabase/migrations/20260624000001_trip_confirmation_items.sql`
- `supabase/migrations/20260624000002_boarding_cards_hotel_stars.sql`
- `supabase/migrations/20260624000003_flight_reconciliation_schema.sql`
- `supabase/migrations/20260624000004_client_view_policies.sql`

---

## 4. Estado de Produção (Verificação Forense)

### 4.1 Ambiente Local vs Produção (Supabase Remoto)

| Elemento / Tabela            | Local | Produção (Remoto) | Divergência                                                                               | Evidência de Validação                                               |
| :--------------------------- | :---- | :---------------- | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `trips` (Colunas estendidas) | Sim   | Sim               | Nenhuma                                                                                   | Consulta real retornou colunas `trip_type`, `lifecycle_status`, etc. |
| `flight_itineraries`         | Sim   | Sim               | Arquivos SQL locais não estão commitados no Git, mas a tabela já está criada na produção. | Consulta real via SDK retornou sucesso com 0 registros.              |
| `flight_segments`            | Sim   | Sim               | Arquivos SQL locais não estão commitados no Git, mas a tabela está criada em produção.    | Consulta real via SDK retornou sucesso com 0 registros.              |
| `trip_confirmation_items`    | Sim   | Sim               | Arquivos SQL locais não estão commitados no Git, mas a tabela está criada em produção.    | Consulta real via SDK retornou sucesso com 0 registros.              |
| `boarding_rooming_list`      | Sim   | Sim               | Nenhuma                                                                                   | Consulta real via SDK retornou sucesso com 0 registros.              |
| `destination_info`           | Sim   | Sim               | Nenhuma                                                                                   | Consulta real via SDK retornou sucesso com 0 registros.              |
| `checkin_links`              | Sim   | Não               | Tabela pendente de implementação e migration (Fase 7).                                    | Erro: `public.checkin_links` não encontrado no cache.                |
| `boarding_events`            | Sim   | Não               | Tabela pendente de implementação e migration (Fase 7).                                    | Erro: `public.boarding_events` não encontrado no cache.              |

### 4.2 Edge Functions Deployadas

Verificamos a existência de 24 subdiretórios de Edge Functions em `supabase/functions/`. A verificação do ambiente remoto confirma que as seguintes funções críticas de integração estão ativas:

- `supplier-ocr-extractor`: Ativa e deployada (Deno REST API pronta).
- `ocr-proposal`: Ativa e deployada.
- `gmail-send`: Ativa e deployada.
- `destination-intelligence`: Ativa e deployada.

> [!WARNING]
> Há divergência no versionamento do Git: as migrations das tabelas `flight_itineraries`, `flight_segments`, `trip_confirmation_items` e RLS policies (`20260624*`) foram aplicadas na produção pelo desenvolvedor anterior diretamente ou via CLI local, mas os arquivos SQL constam como untracked. É imperativo que os arquivos locais em `supabase/migrations/` correspondam exatamente ao banco remoto.
