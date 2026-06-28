# 03 ESPECIFICAÇÃO CONCEITUAL POR MÓDULO

## Módulo: Suporte / Tickets
1. **Finalidade:** Centralizar comunicação com clientes e fornecedores.
2. **Problema que resolve:** Dispersão de emails e falta de SLA.
3. **Entidade Principal:** `support_tickets`.
4. **O que realmente existe:** Refatorado para usar `ticket_timeline` e `ticket_hash`, eliminando o chat fake legado.
