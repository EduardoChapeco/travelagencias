# 15. Plano Corretivo Priorizado

Este plano corretivo organiza as intervenções necessárias por prioridade técnica, indicando as causas raízes, impactos, mudanças necessárias e critérios de aceitação.

---

## 🛑 Prioridade P0: Segurança, Integridade & Privacidade

### 1. RPC de Aprovação Atômica e Idempotente (`approve_group_enrollment`)
- **Causa Raiz**: O frontend executa 8 inserts/updates soltos de forma sequencial no cliente.
- **Impacto**: Falhas parciais geram dados órfãos e quebra do financeiro. Cliques rápidos criam duplicatas.
- **Ação**:
  - Criar uma função de banco de dados PL/pgSQL: `approve_group_enrollment(enrollment_id UUID, agent_id UUID)`
  - A função deve fazer um lock na linha da inscrição (`SELECT FOR UPDATE`), validar a existência de vagas e a unicidade da poltrona, efetuar o upsert do cliente, criar a viagem, criar o plano e a parcela correspondente, criar o lançamento de caixa e atualizar o status para confirmado. Tudo dentro de uma transação atômica nativa.
- **Rollback**: Transações nativas dão rollback automático em qualquer erro interno.
- **Critério de Pronto**: Um único clique invoca `supabase.rpc('approve_group_enrollment')`, eliminando os inserts independentes do frontend.

### 2. Proteção de Privacidade na Rooming List (Isolamento de RLS)
- **Causa Raiz**: O portal do cliente consulta toda a tabela `boarding_rooming_list` e filtra localmente, o que causaria vazamento se a RLS fosse aberta a clientes.
- **Impacto**: RLS bloqueia o acesso e exibe acomodação vazia ao passageiro. Se a RLS for aberta, vaza nomes e quartos de terceiros.
- **Ação**:
  - Manter a RLS SELECT restrita aos agentes da agência.
  - Criar uma função RPC `get_my_room_allocation(trip_id UUID)` marcada como `SECURITY DEFINER`.
  - Esta RPC deve verificar se o usuário logado (`auth.uid()`) é o proprietário da viagem (`trip.client_id`). Se for, faz o SELECT filtrando apenas a linha correspondente do quarto onde o passageiro está alocado, omitindo os demais quartos e pessoas.
- **Critério de Pronto**: O portal do cliente consulta `get_my_room_allocation` e o RLS de `boarding_rooming_list` permanece seguro.

---

## ⚠️ Prioridade P1: Operação e Consistência Contábil

### 3. Sincronização Dinâmica do Faturamento
- **Causa Raiz**: O financeiro lê `total_paid` na inscrição, que não sofre atualização com pagamentos futuros das parcelas da viagem.
- **Impacto**: O ROI e o faturamento exibidos no painel de grupos ficam defasados e permanentemente menores.
- **Ação**:
  - Criar um trigger no banco de dados nas tabelas `payment_installments` ou `financial_records` que recalcule o valor total pago por aquela viagem e atualize de forma síncrona o campo correspondente em `group_tour_enrollments.total_paid`.
  - Alternativamente, reescrever a query do dashboard para calcular dinamicamente a receita somando diretamente as transações liquidadas em `financial_records` vinculadas àquela excursão, em vez de ler o campo estático da inscrição.
- **Critério de Pronto**: O faturamento no painel financeiro de grupos atualiza automaticamente quando uma parcela subsequente do carnê é paga no portal.

### 4. Filtragem do Extrato de Grupos
- **Causa Raiz**: A query do extrato de transações de grupos não filtra se a viagem de fato pertence a um grupo.
- **Impacto**: Extrato poluído com lançamentos de viagens individuais avulsas.
- **Ação**:
  - Ajustar o filtro do Supabase no frontend ou criar uma View específica para extrato de grupos que aplique o filtro `trips.group_tour_id.not.is.null` de forma rigorosa.
- **Critério de Pronto**: Apenas transações financeiras vinculadas a excursões de grupos aparecem no extrato de lançamentos de grupos.

### 5. Idempotência e Vinculação na Criação de Brochuras
- **Causa Raiz**: Proposal Studio cloner gera propostas órfãs redundantes a cada clique por falta de constraint e foreign key.
- **Ação**:
  - Criar uma coluna `group_tour_id` na tabela `proposals` com FK e índice.
  - Na função de criação, verificar se já existe uma proposta vinculada ao `group_tour_id`. Se existir, redirecionar o agente para a brochura existente em vez de criar uma nova.
- **Critério de Pronto**: Clicar no botão "Criar Brochura" abre o Proposal Studio sem gerar duplicatas no banco de dados.

---

## 🎨 Prioridade P3: Ajustes de Usabilidade, Visual & Responsividade

### 6. Suporte a Touchscreen no Drag and Drop da Rooming List
- **Ação**:
  - Adicionar o sensor `TouchSensor` no DndKit do dashboard de quartos:
    ```typescript
    import { TouchSensor } from '@dnd-kit/core';
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );
    ```
- **Critério de Pronto**: Agentes conseguem alocar passageiros arrastando com o dedo em tablets e celulares sem travar a rolagem da tela.

### 7. Ajuste Responsivo do Recibo A4
- **Ação**:
  - Aplicar classes de escala CSS ou redimensionamento fluido ao contêiner do recibo no layout A4 quando renderizado em telas móveis, ou forçar o modo térmico responsivo como padrão automático em telas de largura inferior a 640px.
- **Critério de Pronto**: O recibo A4 cabe na tela de celulares sem causar transbordo ou rolagem horizontal do modal.
