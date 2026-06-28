# 15 SEGURANÇA E MULTI-TENANT

- RLS aplicado a quase 100% das tabelas. Corrigimos recentemente `task_label_assignments`.
- **Risco Restante:** Funções RPC marcadas como `SECURITY DEFINER` devem checar explicitamente o `org_id` do autor.
