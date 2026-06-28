# 16 Segurança, RLS e Multi-Tenancy

Neste documento auditamos o isolamento lógico das tabelas adicionadas nas migrations de Inbox e Gestão de Tarefas, garantindo a integridade multi-tenant da plataforma.

---

## 1. Isolamento Tenancy no Módulo Inbox Omnichannel
As tabelas `conversations`, `messages`, `channels` e `contacts` criadas na migration `20260801000003` foram auditadas:

* **RLS Status:** ✅ Ativo em todas as 4 tabelas operacionais.
* **Políticas de Leitura (SELECT):**
  * Restringe a visualização de dados apenas aos membros da agência ativa (verificado contra `public.profiles` onde `id = auth.uid()`).
  * `agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid())`.
* **Políticas de Escrita (INSERT/UPDATE/DELETE):**
  * Restringe escrita aos membros autenticados da própria organização.
* **Grants de Service Role:**
  * Concedido `GRANT ALL` para a `service_role` para permitir que as Edge Functions de processamento (webhook do WhatsApp, sync do Gmail) manipulem dados com segurança ignorando políticas do RLS do cliente.

---

## 2. Isolamento Tenancy no Módulo de Gestão de Tarefas (V2)
A tabela `tasks` e suas tabelas satélites criadas na migration `20260628170100` foram auditadas:

* **RLS Status:** ✅ Ativo.
* **Política Principal:**
  ```sql
  CREATE POLICY "agency members read tasks" ON public.tasks
    FOR SELECT USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));
  ```
* **Vulnerabilidades Mitigadas:**
  * A coluna `agency_id` é preenchida no backend (derived value) a partir da sessão do usuário autenticado no hook `useTaskMutations.ts`, impedindo que um agente envie um payload forçando a inserção de tarefas em outra organização.
