# 03. Runtime Traceability Matrix (Matriz de Rastreabilidade em Runtime)

Esta matriz mapeia a rastreabilidade do fluxo de dados e ações no sistema:

| Módulo / Ação | UI (Componente/Rota) | Backend (Edge / Service / RPC) | Banco (Tabela/Coluna) | Integração Externa | Estado / Validação |
|---|---|---|---|---|---|
| **Enviar WhatsApp** | `InboxModule` em `agency.$slug.inbox.tsx` | Edge Function `whatsapp-sender` via trigger PG | `public.messages` -> insert `queued` | Meta Graph API `/messages` | `sent` / `delivered` atualizado via webhook |
| **Receber WhatsApp** | Caixa de Entrada | Edge Function `whatsapp-webhook` | `public.messages` -> insert `delivered` | Webhook da Meta | Realtime atualiza a lista de conversas |
| **Conectar Instagram** | Sheet de integração no Inbox | RPC `save-credential` no `ai-orchestrator` | `public.channels` -> insert type `instagram` | Nenhuma | Salva apenas o token e ID de forma manual |
| **Exclusão de Dados** | Rota pública `/data-deletion` | Supabase API padrão | `public.data_subject_requests` | Nenhuma | Gera código de protocolo DEL-XXXX e exibe status |
| **Radar Global** | Rota `/agency/$slug/radar` | Queries padrão no Supabase | `public.trips` e `public.boarding_tickets` | Nenhuma | Renderização em mapa com pins estáticos aproximados |
| **Renomear Coluna** | `KanbanColumn` em `KanbanView.tsx` | Nenhuma | `localStorage` | Nenhuma | Salvamento puramente local do display label |
