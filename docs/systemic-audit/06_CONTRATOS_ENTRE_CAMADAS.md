# 06. Contratos Entre Camadas - Turis

Este documento audita o acoplamento de tipos e interfaces entre as camadas do Turis (UI -> Schema -> Hooks -> Services -> RPCs -> Banco de Dados -> Portais), apontando inconsistências e o uso de casts tipográficos inseguros (`as any` ou `@ts-ignore`).

---

## 1. Auditoria de Fluxos de Dados e Descompassos de Contrato

### 1.1 Fluxo de Onboarding da Agência

- **Contrato da Camada:**
  `UI Form` (zod) -> `onSubmit` -> `create_agency_onboarding` RPC -> `agencies` / `agency_private` / `profiles` (Banco)
- **Auditoria de Tipos:**
  - O Zod Schema `onboardingSchema` define campos de endereço (ex: `address_state`) como opcionais (`z.string().optional()`).
  - No banco de dados, a RPC recebe estes campos e os insere em `agency_private`.
  - **Uso de Cast Inseguro:** O arquivo [auth.onboarding.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/auth.onboarding.tsx#L173-L175) utiliza `@ts-ignore` e `supabase.rpc` sem validação de tipo de retorno, o que esconde eventuais renomeações de colunas no banco.

### 1.2 Fluxo de Conversão de Proposta em Viagem

- **Contrato da Camada:**
  `UI Button` -> `convert_proposal_to_trip` RPC -> `trips` / `boarding_cards` (Banco)
- **Auditoria de Tipos:**
  - A RPC espera `p_proposal_id` e faz a clonagem no Postgres.
  - O frontend chama a RPC usando tipagem implícita. Caso colunas de comissão na tabela `trips` sofram alteração de tipo (ex: de numeric para jsonb), a chamada do front continua compilando, mas a execução em produção falhará de forma silenciosa.

### 1.3 Fluxo de Aceite de Reacomodação Aérea

- **Contrato da Camada:**
  `m.checkin.$token.tsx` (UI) -> `accept_public_reaccommodation` RPC -> `flight_itineraries` (Banco)
- **Auditoria de Tipos:**
  - **Uso de Cast Inseguro:** A chamada da RPC é realizada via:
    ```typescript
    const { error } = await (supabase as any).rpc("accept_public_reaccommodation", { ... });
    ```
  - O cast `as any` é utilizado porque a tabela ou RPC de check-in não existia ou não estava atualizada no arquivo `src/integrations/supabase/types.ts` local do gerador automático. Isso impede o compilador TypeScript de verificar se os nomes dos parâmetros enviados (`p_boarding_card_id`, `p_itinerary_id`) estão corretos.

### 1.4 Fluxo de Reporte de Emergência de Voo

- **Contrato da Camada:**
  `m.checkin.$token.tsx` (UI) -> `submit_emergency_flight_issue` RPC -> `support_tickets` / `boarding_events` (Banco)
- **Auditoria de Tipos:**
  - A RPC espera `p_issue_type` como `delayed` ou `cancelled`.
  - Se no frontend o agente alterar a UI para passar outros enums (ex: `no_show`), o banco de dados rejeitará a transação silenciosamente ou gerará tickets com status de prioridade errados sem que o compilador aponte o erro em tempo de desenvolvimento.

---

## 2. Inventário de Casts `as any` no Repositório

1. **`m.checkin.$token.tsx`:**
   - Linha 103: `(supabase as any).rpc("get_public_boarding_card_details", ...)`
   - Linha 131: `(supabase as any).rpc("update_public_boarding_card_checklist", ...)`
   - Linha 148: `(supabase as any).rpc("create_public_boarding_event", ...)`
   - Linha 159: `(supabase as any).rpc("accept_public_reaccommodation", ...)`
   - Linha 177: `(supabase as any).rpc("submit_emergency_flight_issue", ...)`
   - _Raciocínio Técnico:_ Utilizado para chamar RPCs seguras (`SECURITY DEFINER`) criadas sob demanda na Fase 7 que contornam o isolamento padrão RLS para clientes anônimos acessando o portal móvel.

2. **`auth.onboarding.tsx`:**
   - Linha 174: `supabase.rpc("create_agency_onboarding", ...)` marcado com `@ts-ignore` devido à falta de sincronização dos tipos de dados do arquivo `types.ts` local após a migração de onboarding.

3. **`flight-reconciliation.ts`:**
   - O frontend realiza casts `as any` nas consultas de segmentos aéreos para formatar o objeto diff comparativo de malha, o que mascara se os dados recebidos do banco contêm datas válidas (formato string ISO) ou nulas.

---

## 3. Matriz de Incompatibilidade de Campos Criticos

| Campo Origem (Banco)               | Tipo (Banco)  | Campo Destino (UI) | Tipo (UI)             | Risco de Incompatibilidade                                                                                                             |
| :--------------------------------- | :------------ | :----------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `leads.custom_fields`              | `jsonb`       | CustomFields       | `Record<string, any>` | Erro de parse caso dados mal formatados sejam gravados na tabela sem validação de esquema no hook.                                     |
| `boarding_rooming_list.passengers` | `jsonb`       | Hóspedes           | `Passenger[]`         | Conflito se a estrutura relacional de passageiros mudar (ex: remoção de RG/CPF do KYC), quebrando a renderização do quarto.            |
| `flight_segments.departure_at`     | `timestamptz` | departure_at       | `string` (ISO)        | Erros de timezone (diferença de horas) caso o browser do cliente não converta adequadamente a data GMT.                                |
| `financial_records.amount`         | `numeric`     | amount             | `number` (float)      | Perda de precisão matemática em conversões de moedas estrangeiras ou taxas devido a float-arithmetic.                                  |
| `trip_contracts.compiled_html`     | `text`        | htmlContent        | `string`              | Injeção de scripts (XSS) no portal do cliente caso o HTML recuperado do banco seja renderizado sem sanitização (DOMPurify).            |
| `checkin_links.generated_url`      | `text`        | generated_url      | `string`              | Links HTTP gerados manualmente podem falhar nas políticas de segurança de conteúdo do browser (CSP) se abertos em iframe.              |
| `support_tickets.priority`         | `text`        | priority           | `enum`                | Falta de validação de enum de prioridades. O banco aceita qualquer string, mas a UI só renderiza estilos para `high`, `medium`, `low`. |
