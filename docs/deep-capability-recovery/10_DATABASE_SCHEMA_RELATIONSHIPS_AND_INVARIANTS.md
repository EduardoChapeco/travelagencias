# 10. Database Schema Relationships and Invariants (Esquema de Banco e Constraints)

Este relatório descreve o schema físico do banco de dados Supabase/PostgreSQL, constraints, chaves estrangeiras e políticas de isolamento RLS.

---

## 1. Integridade Referencial e Constraints

Audita as chaves estrangeiras críticas de tarefas e CRM:
* **Tarefa (`tasks`):**
  * **Problema:** A constraint de chave estrangeira em `tasks.assigned_to` e `tasks.created_by` apontava incorretamente para o schema privado `auth.users`, gerando erros de permissão REST.
  * **Resolução:** A migration `20260802000000_fix_tasks_foreign_keys.sql` removeu essas constraints e as apontou de forma segura para `public.profiles(id)` via `REFERENCES public.profiles(id) ON DELETE SET NULL`.
* **Conversa (`conversations`):**
  * Vinculada a `channels(id)` e `contacts(id)` (contatos criados por agência).
* **Mídia e Mensagens (`messages`):**
  * `conversation_id` aponta para `conversations(id) ON DELETE CASCADE` para evitar registros órfãos ao fechar ou apagar um chat.

---

## 2. Invariantes do Domínio e Segurança RLS

* **Isolamento de Tenant (Multi-agency):** Cada agência possui um UUID único em `agencies`. Todas as tabelas operacionais possuem a coluna `agency_id`.
* **Políticas RLS:** 
  * O acesso é controlado comparando o `profiles.agency_id` do usuário logado (`auth.uid()`) com o `agency_id` do registro requisitado.
  * Triggers automáticos garantem a consistência referencial de valores nulos e timestamps em atualizações de dados.
