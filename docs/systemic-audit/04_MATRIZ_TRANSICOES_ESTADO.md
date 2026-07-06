# 04. Matriz de Transições de Estado - Turis

Este documento descreve as máquinas de estado operacionais do Turis, detalhando os estados válidos, as transições permitidas, as regras de segurança/autorização e os bloqueios de transições inválidas.

---

## 1. Máquina de Estados: Lead (CRM)

Controla o progresso de negociação comercial com clientes no funil de vendas.

- **Estados Válidos:** `novo`, `qualificado`, `proposta_enviada`, `negociacao`, `convertido`, `perdido`.
- **Tabela Associada:** `public.leads.status`.

| Estado Origem      | Estado Destino     | Condição / Regra de Negócio                            | Autorização    | Bloqueio / Erro                         |
| :----------------- | :----------------- | :----------------------------------------------------- | :------------- | :-------------------------------------- |
| `novo`             | `qualificado`      | Contato estabelecido com o cliente.                    | Agente / Admin | Sem restrições.                         |
| `qualificado`      | `proposta_enviada` | Uma proposta vinculada foi enviada por e-mail/link.    | Agente / Admin | Exige pelo menos uma proposta ativa.    |
| `proposta_enviada` | `negociacao`       | O cliente solicitou alterações no roteiro.             | Agente / Admin | Sem restrições.                         |
| `negociacao`       | `convertido`       | Proposta aceita pelo cliente; aciona RPC de conversão. | Agente / Admin | Exige proposta aceita e CPF preenchido. |
| _Qualquer um_      | `perdido`          | Negociação cancelada pelo cliente ou inatividade.      | Agente / Admin | Sem restrições.                         |

---

## 2. Máquina de Estados: Proposta Comercial

Controla o ciclo de vida comercial e jurídico das propostas de viagem.

- **Estados Válidos:** `rascunho`, `enviada`, `aceita`, `recusada`, `expirada`.
- **Tabela Associada:** `public.proposals.status`.

| Estado Origem | Estado Destino   | Condição / Regra de Negócio                                                | Autorização      | Bloqueio / Erro                                                                    |
| :------------ | :--------------- | :------------------------------------------------------------------------- | :--------------- | :--------------------------------------------------------------------------------- |
| `rascunho`    | `enviada`        | Proposta finalizada e link compartilhado.                                  | Agente / Admin   | Exige valor total maior que zero.                                                  |
| `enviada`     | `aceita`         | Cliente clica em "Aceitar Proposta" no portal.                             | Cliente / Agente | Exige confirmação de dados de contato.                                             |
| `enviada`     | `recusada`       | Cliente recusa proposta ou recusa em lote.                                 | Cliente / Agente | Exige justificativa opcional em texto.                                             |
| `enviada`     | `expirada`       | Passou do prazo de validade (`expires_at`).                                | Sistema (Job)    | Transição automática pós-prazo.                                                    |
| `aceita`      | _Qualquer outro_ | **BLOQUEIO DE SEGURANÇA:** Propostas aceitas e convertidas são congeladas. | Nenhum           | **Transição inválida:** Proposta aceita não pode voltar para rascunho ou recusada. |

---

## 3. Máquina de Estados: Contrato Jurídico

Controla a legalidade da contratação dos pacotes de viagem.

- **Estados Válidos:** `rascunho`, `pendente_assinatura`, `assinado`, `cancelado`.
- **Tabela Associada:** `public.trip_contracts.status`.

| Estado Origem         | Estado Destino        | Condição / Regra de Negócio                                                 | Autorização           | Bloqueio / Erro                                                           |
| :-------------------- | :-------------------- | :-------------------------------------------------------------------------- | :-------------------- | :------------------------------------------------------------------------ |
| `rascunho`            | `pendente_assinatura` | Agente gera o contrato associado à viagem.                                  | Agente / Admin        | Exige dados de passageiros associados.                                    |
| `pendente_assinatura` | `assinado`            | Assinatura digital válida enviada via portal.                               | Cliente (Contratante) | Exige IP do cliente e upload do PDF.                                      |
| `pendente_assinatura` | `cancelado`           | Agente decide revogar o link de contrato enviado.                           | Agente / Admin        | Link público de assinatura é invalidado.                                  |
| `assinado`            | _Qualquer outro_      | **CONGELAMENTO:** Contratos assinados não podem ser editados ou cancelados. | Nenhum                | **Bloqueado:** Exige geração de adendo para qualquer alteração posterior. |

---

## 4. Máquina de Estados: Faturas e Lançamentos

Controla a integridade dos recebimentos e pagamentos operacionais.

- **Estados Válidos:** `pendente`, `em_analise`, `pago`, `cancelado`, `estornado`.
- **Tabela Associada:** `public.financial_records.status`.

| Estado Origem | Estado Destino | Condição / Regra de Negócio                           | Autorização        | Bloqueio / Erro                                  |
| :------------ | :------------- | :---------------------------------------------------- | :----------------- | :----------------------------------------------- |
| `pendente`    | `em_analise`   | Cliente faz o upload do comprovante Pix/Boleto.       | Cliente / Agente   | Exige upload de arquivo físico real no Storage.  |
| `em_analise`  | `pago`         | Agente de viagens confirma o valor na conta bancária. | Financeiro / Admin | Exige validação manual do comprovante.           |
| `pendente`    | `pago`         | Lançamento manual recebido em dinheiro ou Pix direto. | Financeiro / Admin | Sem restrições.                                  |
| `pago`        | `estornado`    | Devolução de valores por cancelamento da viagem.      | Financeiro / Admin | Exige preenchimento de justificativa de estorno. |
| `pendente`    | `cancelado`    | Parcela cancelada devido a renegociação da dívida.    | Financeiro / Admin | Bloqueia qualquer tentativa de pagamento futuro. |

---

## 5. Máquina de Estados: Itinerário Aéreo (Versões)

Versionamento e reacomodação de voos de passageiros.

- **Estados Válidos:** `active` (itinerário em vigor), `operator_suggestion` (proposta de reacomodação), `archived` (itinerário histórico).
- **Tabela Associada:** `public.flight_itineraries.status` e `public.flight_itineraries.type`.

| Estado Origem         | Estado Destino         | Condição / Regra de Negócio                           | Autorização       | Bloqueio / Erro                                          |
| :-------------------- | :--------------------- | :---------------------------------------------------- | :---------------- | :------------------------------------------------------- |
| `operator_suggestion` | `confirmed` / `active` | Cliente aceita nova malha de voo proposta pela cia.   | Cliente / Agente  | Exige que o anterior `confirmed` seja arquivado.         |
| `confirmed` (active)  | `archived`             | Substituído por nova reacomodação aceita ou deletado. | Sistema (Trigger) | Executado de forma atômica no aceite.                    |
| `archived`            | _Qualquer outro_       | Itinerário no histórico não pode voltar a ser ativo.  | Nenhum            | **Bloqueado:** Protege o histórico de bilhetes emitidos. |

---

## 6. Máquina de Estados: Suporte (Tickets Omnichannel)

Gerenciamento de chamados abertos via portal ou e-mail.

- **Estados Válidos:** `open`, `in_progress`, `resolved`, `closed`.
- **Tabela Associada:** `public.support_tickets.status`.

| Estado Origem | Estado Destino | Condição / Regra de Negócio                           | Autorização       | Bloqueio / Erro                            |
| :------------ | :------------- | :---------------------------------------------------- | :---------------- | :----------------------------------------- |
| `open`        | `in_progress`  | Agente responde à primeira mensagem do ticket.        | Agente / Admin    | Sem restrições.                            |
| `in_progress` | `resolved`     | Atendimento concluído; enviada confirmação.           | Agente / Admin    | Dispara e-mail de satisfação (CSAT).       |
| `resolved`    | `closed`       | Cliente confirma fechamento ou inatividade de 72h.    | Sistema / Cliente | Impede respostas sem reabrir novo chamado. |
| `resolved`    | `in_progress`  | Cliente responde ao e-mail de resolução insatisfeito. | Cliente (E-mail)  | Reabre a thread na fila do Omnichannel.    |
