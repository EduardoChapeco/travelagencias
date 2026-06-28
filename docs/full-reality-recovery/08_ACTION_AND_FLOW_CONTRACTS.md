# 08 Contratos das Ações e Fluxos

Neste documento detalhamos as estruturas de dados e contratos de entrada/saída das principais ações transacionais do sistema.

---

## 1. Fluxo de Criação de Tarefas
* **Componente Emissor:** `CreateTaskModal`
* **Zod Schema:** `CreateTaskFormValues` (em `task.schema.ts`)
* **Contrato DTO (Entrada):**
  ```typescript
  interface CreateTaskFormValues {
    title: string;
    description?: string; // Rich Text HTML/JSON
    status?: TaskStatus;
    priority?: TaskPriority;
    assigned_to?: string; // UUID de auth.users
    due_date?: string; // YYYY-MM-DD
    due_time?: string; // HH:MM:SS
    project_id?: string; // UUID
    space_id?: string; // UUID
  }
  ```
* **Destino do Endpoint:** `supabase.from("tasks").insert(...)` (através de `useTaskMutations`)
* **Processamento Assíncrono:** Trigger Supabase invoca `ai-task-evaluator` na Edge Function para avaliar criticamente a tarefa para score de produtividade.

---

## 2. Fluxo de Envio de Mensagem (Inbox)
* **Componente Emissor:** `ThreadView`
* **Contrato DTO (Entrada):**
  ```typescript
  interface SendMessageDTO {
    conversation_id: string; // UUID
    body: string;
    direction: "outbound";
    sender_user_id: string; // UUID do agente
  }
  ```
* **Destino do Endpoint:** `db.from("messages").insert(...)` (através de mutation no `inbox.tsx`)
* **Processamento Assíncrono:** Trigger `whatsapp-sender` invoca a Edge Function para disparar a mensagem via Meta Graph API caso o canal seja WhatsApp.
