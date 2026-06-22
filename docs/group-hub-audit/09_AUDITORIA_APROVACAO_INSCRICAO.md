# 09. Auditoria do Fluxo de Aprovação de Inscrição B2C

## 1. Riscos de Transação e Registros Órfãos (Falta de Atomicidade)
O fluxo de aprovação de inscrição implementado na mutation `approveEnrollment` em [agency.$slug.group-tours.$id.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.group-tours.$id.tsx) executa uma série de consultas e inserções sequenciais no frontend:
1. Verifica se o cliente já existe na tabela `clients` via e-mail ou documento CPF.
2. Insere novo registro em `clients` se não encontrado.
3. Atualiza `group_tour_enrollments` vinculando a inscrição ao `client_id`.
4. Insere a viagem individual em `trips`.
5. Insere o plano de parcelas em `payment_plans`.
6. Insere a primeira parcela quitada em `payment_installments`.
7. Insere o lançamento de receita em `financial_records` (fluxo de caixa).
8. Atualiza o status da inscrição para `confirmed` em `group_tour_enrollments`.

### Análise de Risco:
**O processo não é atômico**. Não há uma transação (BEGIN/COMMIT) englobando as 8 etapas. Se a conexão falhar ou houver um erro de validação/RLS a partir do passo 5 (ex: bloqueio de permissão de RLS em `payment_plans`), as etapas anteriores (cliente e viagem) **não sofrerão rollback**. O banco ficará em estado inconsistente, com uma viagem criada sem plano financeiro associado, um lançamento de caixa ausente e a inscrição com status "pendente" (órfã).

---

## 2. Concorrência e Clique Duplo (Race Conditions)
- **Falta de Idempotência**: O sistema não gera uma chave de idempotência (`idempotency_key`) para a transação. O frontend gera o código da viagem de forma randômica simples no cliente: `const tripCode = 'GRP-' + Math.floor(1000 + Math.random() * 9000);` (sem verificação de colisão no banco).
- **Risco de Duplicidade**: Se o operador realizar cliques rápidos seguidos no botão de aprovação, ou se dois operadores clicarem ao mesmo tempo, a mutation será disparada em paralelo. Como o primeiro insert do cliente ou da viagem ainda não foi comitado, as consultas de verificação falharão em detectar a duplicidade, resultando em:
  - Criação de múltiplos clientes idênticos.
  - Geração de viagens duplicadas para a mesma pessoa.
  - Lançamentos duplicados no fluxo de caixa geral da agência, gerando fraude contábil acidental.

---

## 3. Validação de Vagas e Poltronas

### Vagas Esgotadas (Overbooking)
A mutation `approveEnrollment` **não realiza nenhuma checagem de limite de vagas** antes de confirmar a inscrição. Se o grupo já atingiu o limite de assentos (`total_seats`), o sistema continuará aprovando inscrições indefinidamente, permitindo overbooking sem qualquer alerta.

### Conflito de Poltronas (Duplicidade de Assento)
Não há verificação se a poltrona (`seat_number`) associada à inscrição que está sendo aprovada já foi alocada para outro passageiro confirmado no mesmo grupo. Duas pessoas podem ser aprovadas com o mesmo assento no ônibus, gerando conflito logístico grave que só será detectado no momento do embarque.
