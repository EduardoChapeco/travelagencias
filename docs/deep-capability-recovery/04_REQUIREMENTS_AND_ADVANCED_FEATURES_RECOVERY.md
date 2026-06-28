# 04. Requirements and Advanced Features Recovery (Plano de Recuperação)

Este relatório apresenta o planejamento de reincorporação e compatibilização de recursos complexos do TravelOS.

---

## 1. Recuperação do RAG e Cérebro Inteligente da Agência

### 1.1 Objetivo Original
* Permitir à agência treinar sua própria inteligência artificial (com documentos, regras tarifárias, regras de bagagem, hotéis parceiros e destinos preferidos) para atuar como um co-piloto nas cotações e respostas de chat.

### 1.2 Status e Recuperação
* **Tabelas do Banco:** A infraestrutura de RAG está modelada na migration `vibetour_memory_rag_tables.sql` (`rag_memories`, `scoring_rules`).
* **Integração no CRM e Cotações:** 
  * O cérebro RAG calcula a pontuação de leads baseando-se em afinidades comportamentais e inteligência de fornecedores.
  * O editor de cotações (`quotes.index.tsx`) lê essas regras para pontuar opções de voos e hotéis sob demanda.
  * Garantiremos que o painel de templates e insights de IA da caixa de entrada consuma estes dados da tabela `crm_leads` em runtime de forma estável.

---

## 2. Recuperação do OCR de Contratos e Passageiros

### 2.1 Objetivo Original
* Permitir ao operador arrastar e soltar PDFs ou imagens de documentos de identidade de passageiros (RG/CPF/Passaporte) e faturas de fornecedores para preencher de forma automática as tabelas de cotação e o perfil de clientes.

### 2.2 Status e Recuperação
* **Edge Functions:** A infraestrutura conta com a Edge Function `processOcrFile` e `ocr-boleto` implementadas.
* **Interface:** Integrada de forma real nos formulários de criação de propostas (`proposals.new.tsx`) e contas a pagar do financeiro (`financial.cash.tsx`).
