# 09 Paridade de Contratos em Runtime

Neste documento auditamos as divergências entre a modelagem de dados do banco de dados (Postgres SQL schemas) e a validação do runtime no frontend (Zod, TypeScript interfaces e DTOs).

---

## 1. Divergências de Tipos de Tarefas (Tasks)

| Campo SQL | Tipo Postgres | Tipo TS (task.types.ts) | Validação Zod (task.schema.ts) | Status da Paridade |
|---|---|---|---|---|
| `description` | `JSONB` | `unknown` | `z.any()` | **EQUIVALENTE** (Casting necessário na UI) |
| `status` | `TEXT` (com check constraint) | `TaskStatus` (enum string) | `z.enum(...)` | **PARIDADE TOTAL** |
| `difficulty_score` | `INTEGER` (CHECK 1..10) | `number` | `z.number().min(1).max(10)` | **PARIDADE TOTAL** |
| `assigned_to` | `UUID` (Nullable) | `string \| null` | `z.string().uuid().optional()` | **PARIDADE TOTAL** |

---

## 2. Divergências de Tipos de Caixa de Entrada (Inbox)

| Campo SQL | Tipo Postgres | Tipo TS / Zod | Problema Identificado |
|---|---|---|---|
| `messages.body` | `TEXT` | Sem tipo forte gerado | O runtime faz queries cruas sem validação Zod no payload de entrada da mensagem |
| `conversations.assigned_user_id` | `UUID` (Nullable) | Sem tipo forte | `assignMutation` no `inbox.tsx` não valida se o `assigned_user_id` é um UUID válido no front antes de disparar |
