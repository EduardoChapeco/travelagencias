# 03. Auditoria do Banco de Dados & Políticas RLS

## 1. Análise da Migration `20260702000000_group_rooming_list_status.sql`

A migração adiciona com sucesso os três campos solicitados para a tabela `group_tours`:

- `rooming_list_status` (TEXT, default `'open'`, com restrição CHECK para `'open'` ou `'closed'`).
- `rooming_list_sent_hotel` (BOOLEAN, default `false`).
- `rooming_list_sent_bus` (BOOLEAN, default `false`).

### Avaliação de Segurança RLS

A tabela `group_tours` possui políticas RLS que limitam leitura e alteração aos membros da agência proprietária (`agency_id`). Contudo, o status e as flags de envio da Rooming List estão acoplados diretamente na tabela `group_tours`.

---

## 2. Crítica da Modelagem do Banco de Dados

| Campo / Tabela                        | Uso Real                                                   | RLS | Histórico | Concorrência | Modelagem Adequada?                                                                                                                                                                                    |
| :------------------------------------ | :--------------------------------------------------------- | :-- | :-------: | :----------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group_tours.rooming_list_status`     | Controla se a lista geral está aberta/fechada.             | OK  |    Não    |    Pobre     | **Inadequada**. O status deveria pertencer a uma entidade própria `rooming_lists`. Se a excursão tiver múltiplos hotéis ou ônibus, um único status unificado impede o fechamento parcial.              |
| `group_tours.rooming_list_sent_hotel` | Flag binária se a lista foi enviada para o hotel.          | OK  |    Não    |    Pobre     | **Inadequada**. Não registra data do envio, usuário responsável, destinatário (e-mail/sistema) ou respostas de erro/confirmação.                                                                       |
| `group_tours.rooming_list_sent_bus`   | Flag binária se a lista foi enviada para o ônibus.         | OK  |    Não    |    Pobre     | **Inadequada**. Mesma limitação que o envio ao hotel.                                                                                                                                                  |
| `boarding_rooming_list`               | Tabela normalizada para armazenar as alocações de quartos. | OK  |    Não    |     Sim      | **Regular**. A inclusão da coluna `version` e a RPC `update_rooming_list_versioned` mitigam concorrência (Lost Update). Porém, armazena passageiros em JSONB, o que impede chaves estrangeiras fortes. |

### Limitações da Modelagem Simplificada

- **Falta de Histórico**: Se o operador reabrir a lista ou reenviar o arquivo atualizado ao hotel, não há rastreabilidade de quem realizou a ação ou quando.
- **Lost Update no JSONB**: Embora a tabela de quartos (`boarding_rooming_list`) possua controle de versão (`version`), o campo `passengers` é do tipo `JSONB`. Isso impede que o PostgreSQL faça o controle transacional clássico sobre inserções de passageiros (se dois agentes alocarem pessoas diferentes na mesma poltrona ou quarto ao mesmo tempo, um deles sobrescreverá o outro a menos que a verificação de versão impeça, o que gera rejeições de inserção incômodas ao invés de enfileiramento).

---

## 3. Vazamento de Dados e Isolamento de Tenants (Multi-tenant RLS Audit)

As tabelas associadas ao fluxo de grupos possuem as seguintes políticas:

1. **`boarding_rooming_list` SELECT RLS**:
   - `public.is_agency_member(auth.uid(), agency_id)`
   - **Risco**: Nenhum cliente final autenticado (`user_id`) consegue ler esta tabela. Isso protege os dados de passageiros de acesso externo, mas **inviabiliza a funcionalidade do portal do cliente** ("Minhas Viagens"), pois o frontend do cliente tenta realizar um `select` geral da tabela de quartos da excursão. Se a política for aberta para permitir leitura de clientes, qualquer cliente em uma excursão poderá ver os dados de quarto e nomes de todos os outros passageiros daquele grupo via rede, expondo informações pessoais de terceiros.
2. **`group_tour_enrollments`**:
   - Possui isolamento básico, mas a lógica de aprovação do painel administrativo é executada no frontend do agente. Um agente mal-intencionado com acesso ao console do browser pode chamar mutações diretamente para aprovar inscrições de outras agências caso as políticas de `UPDATE` da tabela de inscrições não estejam blindadas.
