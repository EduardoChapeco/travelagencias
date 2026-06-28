# 11 Rotas, Sidebars e Navegação

## 1. Rotas Canônicas
O roteador TanStack Router (`src/routes/`) gerencia a descoberta e renderização das seguintes rotas operacionais de produtividade e mensageria:

| Roteamento Físico (Arquivo) | Path da Rota | Componente Principal |
|---|---|---|
| `agency.$slug.daily-tasks.tsx` | `/agency/$slug/daily-tasks` | `TaskShell` (Kanban default) |
| `agency.$slug.inbox.tsx` | `/agency/$slug/inbox` | `InboxModule` (Chat Omnichannel) |
| `agency.$slug.settings.ai-brain.tsx` | `/agency/$slug/settings/ai-brain` | `BrainPanel` (Cérebro Vectorial) |

---

## 2. Sidebar e Descoberta de Módulos
* **Barreira de Acesso Removida:** As abas que antes forçavam navegação interna lenta e mascaravam ausência de dados reais foram removidas.
* **Acesso Direto:** O Kanban (`MyDayView`) agora é acessado instantaneamente ao clicar na rota primária da Sidebar, sem cliques intermediários.
* **Sidebar Contextual de Tarefas:** Exibe filtros dinâmicos rápidos por assignees, tags e prazos sem alterar a rota principal, preservando o estado do Kanban.
