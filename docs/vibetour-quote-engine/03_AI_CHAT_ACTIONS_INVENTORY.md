# 03. Inventário de Ações do Chat Agêntico (AI Chat Actions Inventory)

Este documento cataloga as ações estruturadas (Tools) que a Inteligência Artificial pode executar no Turis, detalhando as regras de segurança e o escopo de atuação.

---

## 1. Inventário de Ferramentas Registradas (`ActionRegistry`)

O arquivo `src/lib/ai/ActionRegistry.ts` centraliza as declarações de ações seguras consumidas pelo assistente:

| Código da Ação          | Descrição da Ação                                  |  Domínio   | Confirmação Exigida | Nível de Risco |
| :---------------------- | :------------------------------------------------- | :--------: | :-----------------: | :------------: |
| **`create_lead`**       | Cadastra um novo lead no funil do CRM.             |    CRM     |         Sim         |     Baixo      |
| **`update_lead`**       | Atualiza os dados de contato ou notas do lead.     |    CRM     |         Sim         |     Médio      |
| **`change_lead_stage`** | Move o lead no pipeline de vendas do CRM.          |    CRM     |         Sim         |     Baixo      |
| **`create_client`**     | Cadastra um cliente oficial no CRM.                |    CRM     |         Sim         |     Médio      |
| **`add_traveler`**      | Vincula um viajante à viagem cadastrada.           |  Viagens   |         Sim         |     Baixo      |
| **`start_quote`**       | Inicializa um registro básico de cotação/proposta. |  Viagens   |         Sim         |     Baixo      |
| **`create_proposal`**   | Gera a proposta final de venda associada.          |  Viagens   |         Sim         |     Médio      |
| **`add_hotel`**         | Insere um voucher de hospedagem na viagem.         |  Viagens   |         Sim         |     Baixo      |
| **`add_flight`**        | Insere um trecho de voo no voucher local.          |  Viagens   |         Sim         |     Baixo      |
| **`register_payment`**  | Lança recebimentos no módulo financeiro.           | Financeiro |         Sim         |      Alto      |
| **`generate_contract`** | Emite o contrato digital e envia ao cliente.       | Documentos |         Sim         |      Alto      |
| **`generate_voucher`**  | Consolida e envia o voucher de embarque.           | Documentos |         Sim         |     Médio      |
| **`start_ocr`**         | Dispara leitura inteligente em PDF de fornecedor.  | Documentos |         Sim         |     Baixo      |

---

## 2. A Camada de Segurança e Orquestração

- **AgentRouter (`AgentRouter.ts`)**: Direciona mensagens de forma condicional para personas especialistas (Gestão, Guia Filipinas, Guia Tailândia, Guia China).
- **Revisora de Segurança (Reviewer Prompt)**: Toda resposta com chamadas de ferramenta passa pelo prompt revisor `REVIEWER_PROMPT` para evitar prompt injection e jargões de programação antes do envio à interface do operador.
- **Confirmação Obrigatória**: Ações com risco Médio ou Alto (como `register_payment` ou `generate_contract`) exigem consentimento explícito do operador humano na UI antes da execução.
