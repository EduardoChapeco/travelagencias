# 02 Inventário de Módulos Apagados, Ocultos ou Substituídos

## 1. Visões do Painel de Tarefas
* **Descrição:** As visões `TimelineView`, `ListView`, `CalendarView`, `WorkloadView` e `ReportsView` estavam vazias e marcadas como "Em Construção". Foram removidas em commits anteriores e subsequentemente **restauradas** para implementar dados reais via `useTasksQuery`.
* **Substituição:** Implementadas visões reais com dados dinâmicos integrados ao Supabase e bibliotecas de visualização como `Recharts` e Gantt nativo.

## 2. Abas do TaskShell (Tabs)
* **Descrição:** O `TaskShell.tsx` continha uma interface cenográfica de `<Tabs>` que forçava a navegação entre 7 abas estáticas de visualização, a maioria vazia.
* **Substituição:** O sistema de abas foi desfeito para carregar o Kanban (`MyDayView`) como visualização padrão de tela cheia, facilitando a navegação diária e a usabilidade do agente.

## 3. Simulador de Seguro
* **Descrição:** O simulador de seguro nas landing pages públicas estava utilizando mensagens hardcoded de "Em breve" e simulações estáticas sem persistência.
* **Substituição:** Refatorado em `BlockRenderer.tsx` para usar o cadastro real de propostas/viagens ou "A definir" nas configurações de planos, integrando ao banco de dados Supabase real para orçamentação e simulação ativa.

## 4. Tabela "Emails" (Painel AI Brain)
* **Descrição:** O painel do Cérebro Vetorial de IA fazia queries na tabela inexistente `emails`.
* **Substituição:** Remapeada a consulta para consumir a tabela `messages` (do módulo Inbox omnichannel recém-criado), exibindo o fluxo real de mensagens processadas.
