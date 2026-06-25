# RLS e Permissões Multi-Tenant

Este documento audita a blindagem de segurança no banco de dados baseada em políticas RLS (Row Level Security), o isolamento de tenants das agências e a restrição append-only de logs.

---

## 1. Políticas RLS Mapeadas no Banco

A migração de banco [20260715000000_ai_chat_improvements.sql](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/supabase/migrations/20260715000000_ai_chat_improvements.sql) assegura o isolamento de tenant rígido:

* **Tabela ai_chat_feedback**:
  * Habilita RLS.
  * `feedback_select`: Permite leitura apenas para membros autenticados pertencentes à agência em questão (`public.is_agency_member(auth.uid(), agency_id)`).
  * `feedback_insert`: Permite gravação apenas se o `user_id` corresponder ao criador autenticado (`user_id = auth.uid()`) e ele for membro da agência.
  * **UPDATE e DELETE**: Bloqueados por default por ausência de políticas (append-only).

* **Tabela ai_agency_memories**:
  * Habilita RLS.
  * `memories_select`: Leitura para qualquer membro da agência.
  * `memories_all`: Escrita (INSERT/UPDATE/DELETE) permitida unicamente para quem possui papel `agency_admin` ou `super_admin`.

* **Tabela ai_chat_messages (Auditoria de Gestor)**:
  * Habilita RLS.
  * `acm_read`: Permite leitura de mensagens apenas para membros da agência que criaram a conversa (`user_id = auth.uid()`) ou para gestores da agência (`has_role(..., 'agency_admin')`) ou administradores globais (`super_admin`). Isso viabiliza o fluxo de auditoria centralizada do gestor sem expor dados entre agências distintas.

---

## 2. Validação Server-Side Adicional

Para reforçar a proteção na camada de aplicação:
* **Autenticação**: As TanStack Server Functions em [ActionExecutor.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/ai/ActionExecutor.ts) e [ai-chat.functions.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/api/ai-chat.functions.ts) utilizam o middleware `requireSupabaseAuth` que valida o JWT do remetente.
* **Isolamento de Tenant**: O executor valida no banco se o operador que disparou a ação pertence à agência passada no payload (`user_roles` query). Se não houver registro ativo, dispara exceção imediata de acesso negado.

---

## 3. Classificação das Entregas de RLS

* **Isolamento Multi-tenant no Banco**: **REAL PONTA A PONTA**
* **Append-Only de Históricos e Feedbacks**: **REAL PONTA A PONTA**
* **Restrição de Acesso Administrativo a Memórias**: **REAL PONTA A PONTA**
