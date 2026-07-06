# Gaps e Duplicações Identificadas (Turis)

Este documento elenca de forma analítica e forense todas as pontas soltas, lógicas mockadas (fakes), e inconsistências sistêmicas encontradas na implementação financeira atual do Turis.

---

## 1. Dados Mocks/Simulados Presentes no Código

> [!WARNING]
> Em oposição direta ao princípio de "nada simulado, nada fake", identificamos dados estáticos (hardcoded) nas seguintes rotas:

### 1.1 Mocks na Rota de Conciliação Diária (`ReconciliationPage`)

No arquivo [ReconciliationPage](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.reconciliation.tsx):

- **Comprovantes de Viajantes (`localPending`)**: Caso o banco falhe ou retorne vazio, o frontend carrega duas parcelas falsas ("Marcos Paulo Souza" - R$ 450,00 e "Luciana Costa Silva" - R$ 1.200,00) de forma silenciosa para o usuário (linhas 64-107).
- **Caixas e Contas (`registersQ` fallback)**: Caso a tabela `cash_registers` não retorne dados, são gerados caixas fictícios ("Caixa Físico Recepção" e "Conta Digital Banco Cora") no tratamento do `catch` (linhas 163-168).
- **Sessões (`sessionsQ` fallback)**: Cria uma sessão mockada `sess-1` ativa para simular expediente aberto no caixa físico (linhas 183-188).

---

## 2. Gaps de Lógica e Arquitetura Financeira

### 2.1 Categoria de Lançamentos Livre (Falta de Plano de Contas)

- **Problema**: O campo `category` em `financial_records` e `cash_transactions` é inserido como texto livre no frontend.
- **Impacto**: Lançamentos escritos como "aluguel", "Aluguel" ou "Despesa Aluguel" aparecem de forma fragmentada no DRE consolidado, destruindo a consistência do relatório gerencial.
- **Solução**: Implementar a tabela estruturada `financial_categories` com chaves estrangeiras rígidas e relacionais.

### 2.2 Cálculos de Negócio no Cliente (Grupos e Excursões)

- **Problema**: A rentabilidade comparativa por grupo, o cálculo do ROI e a projeção de custos fixos vs. variáveis em [groups.tsx](file:///c:/Users/Excel%C3%AAncia%20Tour%20SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.financial.groups.tsx#L164-L190) ocorrem de forma síncrona na renderização do componente React.
- **Impacto**: Lentidão ao navegar quando a agência possuir centenas de excursões históricas e dezenas de milhares de registros no banco. Risco de alteração indevida da fórmula no cliente.

### 2.3 Falta de Registro de Auditoria e Histórico (Compliance)

- **Problema**: Operações de quitação de parcelas ou lançamentos manuais não criam logs imutáveis de trilha de auditoria. Modificações em lançamentos fechados ocorrem sem rastreabilidade.
- **Impacto**: Desalinhamento completo com os princípios de compliance financeiro descritos na Seção 20 do PRD.
- **Solução**: Criação de tabelas append-only de eventos de auditoria financeira (`financial_audit_events`) e travas de alteração em períodos fechados.
