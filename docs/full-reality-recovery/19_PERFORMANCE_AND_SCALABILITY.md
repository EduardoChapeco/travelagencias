# 19 Performance e Escalabilidade

Análise técnica de índices e performance do banco de dados diante de volumetria real em produção.

---

## 1. Otimização de Consultas de Mensageria (Inbox)
A tabela `messages` pode crescer de forma exponencial em operações omnichannel de larga escala.
* **Índice Criado:** `idx_messages_conversation_date` na chave `(conversation_id, created_at)`.
* **Impacto:** Otimiza a renderização de threads do chat (ThreadView) garantindo que a ordenação cronológica e a paginação não gerem Table Scans no Postgres.

---

## 2. Índices Críticos na Gestão de Tarefas (V2)
A migration `20260628170100` adicionou índices direcionados para otimizar as views Kanban, Lista e Relatórios:

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id   ON public.tasks(agency_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON public.tasks(due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks(status) WHERE is_deleted = false;
```

### Justificativa Técnica:
* **Filtros do Kanban:** A busca por `status` e `agency_id` é resolvida em tempo logarítmico (B-Tree).
* **Filtros de Lixeira (Soft Delete):** A cláusula `WHERE is_deleted = false` cria índices parciais eficientes, reduzindo o tamanho físico do índice em disco ao ignorar registros deletados.
