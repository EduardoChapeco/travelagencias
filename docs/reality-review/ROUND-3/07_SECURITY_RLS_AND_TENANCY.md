# Segurança, RLS e Tenancy Hardening — Rodada 3 (TravelOS)

Este documento certifica a integridade das políticas de Row Level Security (RLS) e as garantias contábeis contra fraudes e vazamento de dados.

---

## 1. Imutabilidade do Livro-Razão Contábil

- **RLS em `financial_ledger_entries`**: A antiga política genérica `FOR ALL` foi revogada. A nova política `ledger_entries_access` garante permissão estrita de leitura (`SELECT`) aos membros autenticados da agência. Qualquer operação física de modificação (`UPDATE`) ou exclusão (`DELETE`) é bloqueada e rejeitada no nível do banco de dados, garantindo a imutabilidade absoluta de toda a auditoria de partidas dobradas.

---

## 2. RLS e Privacidade de Ajustes de Comissão

- **Privacidade em `seller_adjustments`**: A política foi segregada para que agentes comuns possuam privilégio estrito de leitura (`SELECT`) apenas sobre seus próprios ajustes de comissão, impedindo-os de ver ou editar dados de outros vendedores. As operações de alteração, inserção ou exclusão são restritas unicamente aos papéis administrativos (`agency_admin` / `super_admin`).

---

## 3. Isolamento da Rooming List no Portal do Cliente

- **Proteção à LGPD**: O acesso direto via `SELECT` à tabela de alocação de quartos `boarding_rooming_list` permanece restrito aos agentes da agência. Para exibir a alocação do passageiro no portal de autoatendimento, o sistema invoca a RPC segura `get_my_room_allocation` com a flag `SECURITY DEFINER`. Ela valida a propriedade da viagem (`auth.uid() == client.user_id`) e retorna estritamente a linha do quarto do passageiro logado, omitindo nomes e quartos de terceiros.
