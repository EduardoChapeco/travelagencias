# 07 Arquitetura Esperada vs Atual

## 1. Módulo Inbox e Omnichannel

### Arquitetura Esperada (Inbox V2 Canônico)
```mermaid
graph TD
  A[WhatsApp/Email Webhook] --> B[Edge Function: whatsapp-webhook]
  B --> C[Table: conversations]
  B --> D[Table: messages]
  E[UI: inbox.tsx] -->|React Query| C
  E -->|Realtime Sub| D
```

### Arquitetura Atual (Constatada)
* O webhook de mensagens de entrada (`supabase/functions/whatsapp-webhook`) ainda grava no schema legado: `omnichannel_sessions` e `omnichannel_messages`.
* A nova tela de Inbox (`src/routes/agency.$slug.inbox.tsx`) faz queries em `conversations` e `messages` (migration `20260801000003`).
* **Consequência:** As mensagens em tempo real que chegam do WhatsApp não aparecem na nova caixa de entrada. O sistema de mensageria está desconectado.

---

## 2. Gestão de Tarefas (Task Management V2)

### Arquitetura Esperada
```mermaid
graph TD
  A[useTasksQuery] --> B[Supabase Client]
  B --> C[Table: tasks]
  C --> D[Trigger: resolved_at update]
  C --> E[Trigger: calculated duration]
```

### Arquitetura Atual (Constatada)
* A arquitetura foi 100% migrada da antiga tabela `legacy_agent_tasks` para a tabela de tasks nova (`tasks`).
* As views (`ListView`, `CalendarView`, etc.) consultam o hook `useTasksQuery` que consome a tabela correta.
* Os tipos TS estão locais em `task.types.ts` devido à desatualização do `types.ts` gerado pelo Supabase CLI.
