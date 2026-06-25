# 17. Registro de Lacunas, Riscos e Limitações da Integração

Este documento detalha o mapeamento de riscos operacionais, limitações técnicas da API **Infotravel** e as barreiras de integração identificadas durante a auditoria forense do ecossistema do **TravelOS**.

---

## 1. Registro Técnico de Gaps e Limitações da API

A especificação física da API da Infotera impõe restrições severas que impactam a robustez do sistema se não mitigadas adequadamente:

### 1. Ausência de Webhooks Nativos (Falta de Sincronização em Tempo Real)

- _Gap_: A API não disponibiliza barramento de webhooks para notificar o TravelOS quando uma reserva for alterada, cancelada ou paga diretamente no portal web da operadora.
- _Impacto_: Risco alto de inconsistência contábil e de vouchers caso alterações ocorram fora do ecossistema local.
- _Mitigação_: Implementação obrigatória de polling incremental agendado (Fila de Sync) que varre reservas ativas com partida nos próximos 30 dias de forma periódica (ex: a cada 4 horas).

### 2. Barramento Unidirecional de Escrita (Cadastro de Clientes e Pagamentos)

- _Limitação_: A API é essencialmente voltada para consulta e leitura de reservas. Diversos recursos, como geração física de links de pagamento, financiamentos ou faturamento de caixa, não possuem endpoints de escrita expostos ou liberados.
- _Impacto_: Impossibilidade técnica de realizar fluxo bilateral completo para faturamento em tempo real.
- _Mitigação_: Documentar de forma explícita na UI quais fluxos exigem intervenção manual do operador no portal da operadora, evitando falsas promessas de automação integral.

---

## 2. Análise de Riscos de Integração

| Risco ID        | Descrição do Risco                                                                                            | Impacto Potencial                                             |  Classificação   | Estratégia de Mitigação                                                                 |
| :-------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------ | :--------------: | :-------------------------------------------------------------------------------------- |
| **RSK-INFO-01** | **Evasão de Privilégios (IDOR)**: Operador alterando parâmetros de chamada para usar chaves de outra agência. | Vazamento de credenciais e faturamento cruzado entre tenants. | **P0 (Crítico)** | Validar de forma física na Edge Function a relação entre usuário ativo e `agency_id`.   |
| **RSK-INFO-02** | **Indisponibilidade de API Externa**: Queda ou lentidão extrema no barramento da Infotravel.                  | Travamento do fluxo de propostas e vendas do operador.        |  **P1 (Alto)**   | Implementar timeouts rígidos (30s) e fallbacks explícitos para montagem manual na UI.   |
| **RSK-INFO-03** | **Estouro de Cota (Rate Limit)**: Bloqueio de IP por excesso de requisições paralelas em backfill.            | Queda imediata de toda a integração da agência com o GDS.     |  **P1 (Alto)**   | Implementar fila com throttling (1 req/s) e Backoff Exponencial para carga em lote.     |
| **RSK-INFO-04** | **Duplicidade Contábil**: Importações repetidas gerando múltiplos vouchers e lançamentos de faturamento.      | Relatórios de ROI e Razão Contábil inconsistentes.            |  **P1 (Alto)**   | Chave de unicidade rígida em `external_entity_links` atuando como barreira de inserção. |

---

## 3. Limitações de Escopo Declaradas

A integração **não abrange**:

- Processamento e liquidação direta de transações de cartão de crédito no barramento GDS.
- Emissão física de apólices de seguro de viagem ou bilhetes aéreos consolidados sem verificação prévia de saldo/crédito da agência parceira junto à operadora.
- Sincronização automática de dados de caixa físico de filiais externas não mapeadas em tabelas relacionais do TravelOS.
