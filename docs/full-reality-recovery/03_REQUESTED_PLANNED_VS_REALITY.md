# 03 Solicitado, Planejado vs Realidade

## Matriz Mestra de Realidade do Sistema

Este inventário contrasta o que foi solicitado/planejado com o que está codificado e integrado na infraestrutura atual do Supabase.

| Módulo / Feature | Status de Codificação | Integração Supabase | RLS & Tenancy | Classificação Real |
|---|---|---|---|---|
| **Gestão de Tarefas (Kanban)** | Completo (MyDayView) | Real (`tasks` table) | Ativo (isolado por `agency_id`) | **REAL PONTA A PONTA** |
| **Gantt / Timeline Tasks** | Completo (TimelineView) | Real (`tasks` table) | Ativo | **REAL PONTA A PONTA** |
| **Lista de Tarefas** | Completo (ListView) | Real (`tasks` table) | Ativo | **REAL PONTA A PONTA** |
| **Calendário de Tarefas** | Completo (CalendarView) | Real (`tasks` table) | Ativo | **REAL PONTA A PONTA** |
| **Carga de Trabalho (Workload)** | Completo (WorkloadView) | Real (`tasks` table) | Ativo | **REAL PONTA A PONTA** |
| **Relatórios de Tarefas** | Completo (ReportsView) | Real (`tasks` table) | Ativo | **REAL PONTA A PONTA** |
| **Inbox Omnichannel** | Completo (InboxModule) | Real (`conversations`/`messages`) | Ativo | **REAL, MAS NÃO TESTADO** |
| **Cérebro AI (Vector RAG)** | Parcial | Real (`knowledge_documents`) | Ativo | **REAL, MAS NÃO TESTADO** |
| **Fornecedores Stats B2B** | Completo (Detail page) | Real (`proposal_items`) | Ativo | **REAL PONTA A PONTA** |
| **Assinatura Contratos** | Completo | Real (`contracts` table) | Ativo | **REAL PONTA A PONTA** |
| **DRE Financeiro** | Parcial | RPC (`calculate_dre_summary`) | Ativo | **PARCIAL** (requer teste da RPC) |
| **Geração de PDF Voucher** | Completo | Edge Function / Storage | Ativo | **REAL PONTA A PONTA** |
| **Geração de PDF Proposta** | Completo | Edge Function / Storage | Ativo | **REAL PONTA A PONTA** |
| **Integração WhatsApp Webhook** | Completo | Edge Function / Meta API | Ativo | **REAL, MAS NÃO TESTADO** |
| **Integração Gmail OAuth** | Completo | Edge Function / Google API | Ativo | **REAL, MAS NÃO TESTADO** |
