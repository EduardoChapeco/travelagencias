# 07. Sincronização do Ciclo de Vida da Reserva

Este documento descreve o fluxo transacional do ciclo de vida da reserva, detalhando os estados físicos da API **Infotravel/Infotera**, o mapeamento para os estados internos do **TravelOS** e os procedimentos de segurança contra falhas de comunicação no handshake de emissão.

---

## 1. Mapeamento de Estados da Reserva

A reserva possui status distintos em ambos os sistemas. A sincronização deve garantir a consistência bidirecional de estados:

| Estado TravelOS | Significado | Estado Infotravel | Ação da API |
| :--- | :--- | :--- | :--- |
| `planning` | Proposta sendo montada ou aguardando aceite. | N/A | N/A (Apenas cotações locais) |
| `confirmed` | Venda fechada. Reserva enviada ao GDS. | `PENDING` (Aguardando Confirmação) | `POST /api/v1/booking` |
| `confirmed` | Reserva emitida e garantida. | `CONFIRMED` / `ACTIVE` | `POST /api/v1/booking/{id}/confirm` |
| `cancelled` | Viagem cancelada pelo operador ou cliente. | `CANCELLED` | `DELETE /api/v1/booking/{id}/cancel` |
| `in_progress`| Viagem ocorrendo. Passageiro em trânsito. | `ACTIVE` | N/A |
| `completed`  | Viagem concluída com sucesso. | `COMPLETED` | N/A |

---

## 2. Fluxo Transacional e Handshake de Emissão

Para evitar o pior cenário contábil e operacional — cobrar o cliente e não emitir a reserva, ou emitir a reserva no GDS e falhar em registrar no banco local —, o processo de confirmação de reservas segue um protocolo rígido de handshake transacional:

```txt
1. Operador clica em "Confirmar Emissão" no painel TravelOS
   │
   ├──> [Fase 1: Travamento e Verificação Contábil]
   │    Verifica se há saldo, fechamento aberto ou pagamento aprovado no TravelOS.
   │
   ├──> [Fase 2: Check Rate da Tarifa]
   │    Chama `POST /api/v1/checkRate` para garantir que o preço não sofreu alteração.
   │    Se a tarifa expirou/alterou, aborta a transação e notifica a UI.
   │
   ├──> [Fase 3: Pré-Reserva no GDS]
   │    Executa `POST /api/v1/booking` enviando dados de clientes e passageiros.
   │    Recebe o `booking_id` da Infotravel (Reserva em estado PENDING).
   │    Registra o vínculo em `external_entity_links` com status 'pending'.
   │
   ├──> [Fase 4: Confirmação e Emissão Física]
   │    Chama `POST /api/v1/booking/{id}/confirm`.
   │    Se a chamada falhar (ex: timeout de rede ou erro 500 no GDS):
   │    │  O sistema executa a compensação (Rollback):
   │    │  Chama `DELETE /api/v1/booking/{booking_id}/cancel` para liberar os assentos/bloqueios.
   │    │  Marca a viagem no TravelOS com status 'failed_issue' para revisão manual.
   │    │
   │    └──> Se a confirmação for bem-sucedida:
   │         Recebe localizadores (PNR) e bilhetes da operadora.
   │         Atualiza `external_entity_links` para 'synced'.
   │         Grava os lançamentos no Razão Contábil (`financial_ledger_entries`).
   │         Dispara e-mail e notificação com o voucher final para o cliente.
```

---

## 3. Mecanismo de Compensação e Resiliência
* **Idempotência de Criação**: Toda chamada para `POST /api/v1/booking` deve enviar um cabeçalho ou parâmetro de chave de idempotência único (`request_id` correspondente à proposta do TravelOS). Caso a API do Infotravel sofra instabilidade e o TravelOS tente reenviar a chamada, a API retornará a reserva já criada em vez de duplicar a emissão de assentos/quartos.
* **Fila de Dead-Letter (DLQ)**: Reservas que receberam status de confirmação na API, mas cuja resposta de rede falhou em retornar para o TravelOS (deixando o sistema local sem a confirmação de sucesso), entram em uma fila de auditoria assíncrona. Um job em segundo plano consulta periodicamente `GET /api/v1/backoffice/checkBooking/{id}` para reconciliar o status real da reserva no GDS e atualizar o banco local de forma autônoma.
