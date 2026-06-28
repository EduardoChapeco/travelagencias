# 11. Tasks Kanban, Timeline, and Calendar (Realidade do Módulo de Tarefas)

## 1. Visões do Módulo de Tarefas
* **Kanban:** Totalmente operacional. Permite arrastar colunas, mover cards, visualizar checklists e gerenciar prazos.
* **Lista:** Totalmente operacional, exibindo agrupamento por status e filtros por responsáveis.
* **Timeline, Calendário, Meu Dia, Workload, Relatórios:**
  * Algumas destas visões dependem de consultas e joins que foram corrigidos para evitar spinners infinitos.
  * O carregamento agora usa queries PostgREST normais com chaves estrangeiras ajustadas.

## 2. Nomes e Ordem das Colunas do Kanban
* **Display Labels:** As colunas do Kanban usam os valores do enum `TaskStatus`. A alteração do nome da coluna é salva no `localStorage` do navegador sob a chave `ta_kanban_column_labels_v2` e injetada no componente de forma local.
* **Limitação:** Como a ordenação e os nomes customizados dependem exclusivamente do `localStorage`, a alteração é restrita ao dispositivo do operador atual, não sendo compartilhada com outros agentes da mesma agência no banco de dados.
