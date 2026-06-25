# Plano de Implementação: Fase E — Check-in Links & Reacomodação

Este plano de ação implementa a estruturação de controle de check-in, geração dinâmica de deep links de companhias aéreas (LATAM, GOL, Azul), registro de eventos de embarque e canal de reacomodação e emergência para passageiros no Portal do Cliente móvel.

## Diagnóstico Forense & Gaps

1. **Ausência de Tabelas Estruturais:** As tabelas `checkin_links` e `boarding_events` propostas para o check-in de cias aéreas estão ausentes no banco de dados e nos tipos do Supabase.
2. **Links de Check-in Estáticos/Mockados:** A página de check-in móvel (`/m/checkin/$token`) exibe apenas o PNR em texto, sem links de direcionamento funcionais e dinâmicos para as respectivas companhias.
3. **Falta de Gestão de Reacomodação:** Não existe fluxo para exibir alternativas de voos (sugestões da agência/operadora) no portal móvel nem botão para o cliente confirmar o aceite de voos alternativos em caso de problemas.
4. **Sem Canais de Emergência Rápidos:** O portal móvel não possui um botão direto para reportar atraso/cancelamento de voos que crie automaticamente um ticket de suporte urgente e registre o evento no banco.

---

## Proposed Changes

### 1. Database & Migrations

#### [NEW] [20260625000003_checkin_links_and_boarding_events.sql](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260625000003_checkin_links_and_boarding_events.sql)

- Criar tabela `checkin_links` relacionando trecho (`flight_segment_id`) e agência com o respectivo link.
- Criar tabela `boarding_events` registrando eventos de viagem de passageiros (`checked_in`, `boarded`, `reaccommodation_accepted`, `flight_issue`, etc.).
- Habilitar RLS e criar políticas de isolamento para agências (membros ativos de cada agência).
- Criar funções `SECURITY DEFINER` e expor RPCs seguras para acesso anônimo/passageiro:
  - `get_public_boarding_card_details(p_id uuid)`: Retorna os dados do cartão, a lista de passageiros vinculados, os trechos de voos confirmados ativos com seus links de check-in, e as sugestões de reacomodação ativas.
  - `create_public_boarding_event(p_boarding_card_id uuid, p_traveler_id uuid, p_flight_segment_id uuid, p_event_type text, p_metadata jsonb)`: Registra cliques em links de check-in.
  - `accept_public_reaccommodation(p_boarding_card_id uuid, p_itinerary_id uuid)`: Aceita a reacomodação, arquiva o voo antigo, ativa o novo itinerário e loga o evento de aceitação.
  - `submit_emergency_flight_issue(p_boarding_card_id uuid, p_issue_type text, p_description text)`: Registra o evento de atraso/cancelamento no banco de dados e abre um ticket de suporte de alta prioridade (`high`) no painel do agente.

---

### 2. Frontend Utilities

#### [NEW] [airline-deeplinks.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/utils/airline-deeplinks.ts)

- Implementar gerador de deep link com as regras dinâmicas de cada companhia:
  - **LATAM:** `https://www.latamairlines.com/br/pt/check-in?orderId={pnr}&lastName={lastName}`
  - **GOL:** `https://b2c.voegol.com.br/check-in/dados-voo?recordLocator={pnr}&departureAirport={origin}`
  - **Azul:** `https://checkin.voeazul.com.br/?pnr={pnr}&origin={origin}`
  - **Fallback/Outros:** Busca rápida no Google.

---

### 3. Portal do Cliente Móvel

#### [MODIFY] [m.checkin.$token.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/m.checkin.$token.tsx)

- Utilizar RPC `get_public_boarding_card_details` para buscar cartões, passageiros, trechos ativos e reacomodações.
- **Seção de Bilhetes e E-Checkin:**
  - Renderizar os cartões dos trechos reais de voo.
  - Exibir botão de redirecionamento "Fazer Check-in na [Cia]" (ex: LATAM, GOL, Azul).
  - Selecionar dinamicamente o passageiro (ou usar o sobrenome do primeiro passageiro da lista) e o aeroporto de origem para formatar a URL correta.
  - Chamar `create_public_boarding_event` no clique do botão para registrar a tentativa de check-in.
- **Widget de Reacomodação:**
  - Se houver `reaccommodations`, renderizar um card com destaque editorial suave contendo os novos horários e voos sugeridos.
  - Botão "Confirmar Novo Itinerário" que executa a transação via `accept_public_reaccommodation` e atualiza a interface com os novos voos.
- **Painel de Emergência:**
  - Seção visualmente diferenciada e elegante contendo dois botões: "Meu voo atrasou" e "Meu voo foi cancelado".
  - Permitir inserir observações breves e invocar o RPC `submit_emergency_flight_issue` para disparar o alerta de forma imediata à agência.

---

### 4. Painel de Controle do Agente

#### [MODIFY] [agency.$slug.trips.$id.boarding.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.boarding.tsx)

- Adicionar painel de **Overrides de Links de Check-in** por trecho de voo, permitindo o agente cadastrar URLs customizadas (que substituem os deep links automáticos).
- Adicionar painel de **Linha do Tempo de Embarque** (Timeline de Eventos), listando em ordem cronológica todos os cliques de check-in, aceites de voos e ocorrências reportadas pelos clientes finais.

---

## Verification Plan

### Automated Tests

- Executar `npm run typecheck` para garantir que as alterações no frontend e definições de banco de dados se integram sem erros de tipo.
- Executar `npm run build` para garantir a geração correta do pacote de produção.

### Manual Verification

1. Aplicar a nova migração via script remoto.
2. Atualizar o arquivo local `src/integrations/supabase/types.ts` com a nova estrutura de tabelas e funções.
3. Simular o fluxo de acesso do passageiro com token móvel:
   - Clicar nos links de check-in gerados e validar se abrem a URL da cia com parâmetros preenchidos.
   - Aceitar uma sugestão de reacomodação e verificar se o itinerário principal no banco de dados foi atualizado.
   - Reportar uma emergência e verificar a criação automática do ticket no suporte.
4. Entrar no painel do agente e atestar que a timeline mostra os eventos físicos criados e que é possível configurar overrides de links.
