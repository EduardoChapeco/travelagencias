# 06. Auditoria de Banco, RLS e Migrações - TravelOS

Este documento apresenta a análise de integridade referencial, controle de versão de migrations no Supabase e a auditoria de segurança das políticas de Row Level Security (RLS) das tabelas públicas.

---

## 1. Status do Versionamento de Migrações

- **Status Atual:** Sincronizado. As migrações locais que antes constavam como não rastreadas (linhas `20260626*` e `20260627*`) foram totalmente integradas e comitadas no repositório após o `git pull` na branch `main`.
- **Sincronia Remota:** A verificação via Supabase CLI (`npx supabase migration list`) confirmou que todas as **173 migrações** locais estão aplicadas com sucesso no banco de dados de produção (`esmppoxxnyiscidzsjvy`), sem drifts pendentes de schema.

---

## 2. Auditoria Forense de RLS (Row Level Security)

Todas as tabelas críticas do sistema possuem RLS ativado por padrão. No entanto, identificamos riscos pontuais de isolamento multi-tenant:

### 2.1 Políticas de Agência (Isolamento Multi-tenant)

As tabelas operacionais associadas a fornecedores, voos e contratos validam o acesso do usuário logado comparando o `agency_id` com a lista de membros ativos da agência na tabela `public.agency_members`.

- **Exemplo de Política Segura:**
  ```sql
  CREATE POLICY "Membros da agência podem visualizar" ON public.supplier_products
    FOR SELECT TO authenticated
    USING (agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = auth.uid() AND status = 'active'
    ));
  ```
- **Status:** Conforme. RLS ativado e testado em produção.

### 2.2 Políticas de Acesso Público de Clientes (B2C)

As tabelas expostas para check-in e assinatura pública de contratos (`boarding_cards`, `flight_itineraries`, `trip_contracts`) utilizam políticas de leitura anônima baseadas em tokens seguros (ex: `p_token`).

- **Risco de Segurança:** As funções que processam aceites públicos de contratos e check-ins devem conter validação rigorosa de token no backend (RPCs de `SECURITY DEFINER`). Se um cliente anônimo puder invocar inserções diretas em tabelas operacionais sem passar pela RPC de validação do token, o isolamento dos dados de agências concorrentes pode ser violado.
- **Status:** As RPCs de checkout e check-in como `get_public_boarding_card_details` e `accept_public_reaccommodation` foram atualizadas com checagem rigorosa de token criptográfico.

---

## 3. Integridade e Riscos de Drift no Banco de Dados

- **O Risco da Rooming List Duplicada (Tabelas Concorrentes):**
  A alocação de quartos em excursões é gravada tanto no campo JSONB `group_tours.rooming_list` quanto na tabela relacional `boarding_rooming_list`.
  - _Ação Corretiva:_ Criar uma migração de sanitização que remova a coluna `rooming_list` da tabela `group_tours` após verificar que todos os dados legados foram convertidos e persistidos na tabela relacional `boarding_rooming_list`.

- **Desacoplamento de Malhas de Voo:**
  As tabelas `flight_itineraries` e `flight_segments` controlam a malha corporativa da agência, mas os bilhetes individuais do passageiro ficam na tabela plana `boarding_tickets`.
  - _Ação Corretiva:_ Criar regras de sincronia via triggers do banco para que, ao confirmar um itinerário corporativo, o sistema propague as alterações de PNR, aeroportos e horários para os registros de embarque correspondentes na tabela `boarding_tickets`.
