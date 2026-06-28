# 07. Routes, Navigation and Sidebars (Rotas e Navegação)

Este relatório mapeia o fluxo de navegação do TravelOS e a arquitetura de sidebars do shell de navegação.

---

## 1. Estrutura de Navegação em Três Níveis

### 1.1 SlimSidebar (Nível 1 - Extrema Esquerda)
* **Objetivo:** Exibir os módulos principais da plataforma de forma compacta (ícones de 56px de largura).
* **Módulos promovidos:** 
  * Dashboard Principal (`/`)
  * CRM & Funil (`/crm`)
  * Inbox / Mensagens (`/inbox`)
  * Agenda / Calendário (`/calendar`)
  * Financeiro (`/financial`)
  * Configurações da Agência (`/settings`)

### 1.2 AppSidebar (Nível 2 - Menu Contextual Dinâmico)
* **Objetivo:** Mostrar o sub-menu específico do módulo ativo quando necessário.
* **Exemplo (Tarefas):** Ao entrar em `/daily-tasks`, a SlimSidebar se mantém na extrema esquerda e a AppSidebar se expande exibindo as sub-visões de tarefas (Meu Dia, Quadro Kanban, Lista, Timeline, Calendário, Workload, Relatórios).
* **Navegação Síncrona:** A alternância de sub-itens na AppSidebar altera a URL query param `?view=` através do TanStack Router, renderizando o `<TabsContent>` correspondente instantaneamente.

### 1.3 Barra de Ferramentas Superior (Nível 3 - Ações Rápidas)
* Contém a barra de pesquisa contextual, filtros de busca de dados, alertas de notificações em tempo real e o botão de gatilho para novas ações (ex: "+ Nova Tarefa", "Canais").
* **Despoluição:** O menutabs horizontal que duplicava os sub-itens de tarefas no meio da página foi completamente removido, permitindo foco visual absoluto.
* **Canais Conectados:** Removida a primeira coluna fixa de contas na tela principal de Inbox. Agora, as conexões de canais (Gmail, WhatsApp, Instagram) abrem através de um Sheet lateral deslizante à esquerda, economizando espaço valioso na viewport.
