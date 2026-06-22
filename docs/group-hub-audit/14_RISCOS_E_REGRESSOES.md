# 14. Riscos & Regressões

Este documento consolida as principais vulnerabilidades de segurança, fragilidades operacionais e potenciais regressões visuais/funcionais identificadas na implementação do módulo de Grupos.

---

## 🛠️ Riscos de Gravidade P0 (Segurança, Privacidade & Integridade)

### 1. Vazamento de Dados Pessoais (LGPD) no Portal do Cliente
- **Causa**: O portal do cliente tenta baixar a lista de quartos (`boarding_rooming_list`) inteira da excursão no frontend para achar o quarto dele.
- **Risco**: Se a RLS for alterada para permitir a leitura por clientes, qualquer usuário em um grupo poderá ver os dados (nome completo, quarto, etc.) de todos os outros passageiros daquele grupo interceptando a requisição HTTP no console de desenvolvedor.

### 2. Inconsistência Transacional Crítica (Aprovação Não Atômica)
- **Causa**: O fluxo de aprovação executa 8 requisições `insert`/`update` individuais no frontend em vez de uma transação isolada (RPC) no banco.
- **Risco**: Falhas de rede ou de permissões RLS no meio da execução gerarão registros órfãos irreversíveis (viagens criadas sem carnê de parcelas ou sem lançamento no fluxo de caixa geral).

### 3. Cliques Duplos e Race Conditions na Criação de Entidades
- **Causa**: Falta de chaves de idempotência ou locks ao aprovar inscrições.
- **Risco**: Múltiplos disparos paralelos criarão clientes duplicados, viagens duplicadas e lançamentos contábeis duplicados (fraude financeira involuntária no caixa geral).

---

## ⚙️ Riscos de Gravidade P1 (Falhas Operacionais & Regras de Negócio)

### 4. Dessincronização Financeira de Receita (Faturamento Defasado)
- **Causa**: O faturamento de grupos lê o campo estático `group_tour_enrollments.total_paid`, que nunca é atualizado quando parcelas do carnê de pagamento do cliente são quitadas futuramente.
- **Risco**: O painel financeiro de grupos exibirá dados de receita desatualizados e permanentemente inferiores aos valores que de fato foram quitados pelo cliente.

### 5. Multiplicação Indevida de Custos Variáveis
- **Causa**: O cálculo de custos multiplica qualquer custo do tipo "variável" pela quantidade de passageiros.
- **Risco**: Se o operador cadastrar um custo variável consolidado (ex: "Fretamento extra de van: R$ 500") em vez de um custo unitário (por pessoa), o sistema multiplicará 500 por 20 passageiros, inflando o custo para R$ 10.000 e exibindo prejuízo irreal.

### 6. Poluição de Extrato de Lançamentos de Grupos
- **Causa**: A consulta de extrato de grupos junta transações usando `trips!inner` sem filtrar `group_tour_id IS NOT NULL`.
- **Risco**: O extrato específico do hub de grupos exibirá lançamentos financeiros de viagens individuais normais da agência.

### 7. Bloat de Dados no Proposal Studio (Brochuras Órfãs)
- **Causa**: A criação de brochuras no Studio não possui idempotência e não utiliza vínculo estruturado (`group_tour_id`).
- **Risco**: Múltiplos cliques do agente criam dezenas de propostas comerciais idênticas e órfãs, acumulando lixo eletrônico na tabela `proposals`.

### 8. Recibo de Pagamento Alterável Retroativamente
- **Causa**: Recibos são gerados dinamicamente no frontend sem snapshot ou hash persistidos.
- **Risco**: Se o nome do passageiro ou o preço da viagem forem editados futuramente no painel administrativo, a emissão de uma 2ª via do recibo sairá com informações diferentes da 1ª via original, o que invalida sua confiabilidade auditoria.

### 9. Ausência da Exportação para Word
- **Causa**: Funcionalidade prometida como concluída, mas omitida por completo no código.
- **Risco**: Frustração do usuário ao tentar exportar a Rooming List em formato de documento editável (.docx).
