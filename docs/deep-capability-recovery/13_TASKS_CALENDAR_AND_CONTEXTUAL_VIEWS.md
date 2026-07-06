# 13. Tasks, Calendar and Contextual Views (Tarefas e Agendas)

Este relatório descreve a arquitetura canônica para gestão de atividades, tarefas e compromissos no Turis.

---

## 1. Núcleo Canônico Reutilizável

Para evitar código duplicado e generalização excessiva entre tarefas e compromissos:
* **Tarefa (`Task`):** Ação individual com prazo atribuído a um consultor (ex: "Confirmar recebimento do PIX").
* **Compromisso / Reunião (`Event`):** Bloqueio de horário na agenda da agência com múltiplos participantes (ex: "Reunião de Briefing de Grupo").
* **Estrutura de Domínio Compartilhável:**
  * `tasks` (tabela de tarefas operacionais da agência com data de conclusão e progresso).
  * `calendar_events` (tabela de eventos da agência e calendário de marketing).

---

## 2. Projeções Contextuais da Interface

Cada módulo consome a estrutura de dados de acordo com seu contexto específico:
1. **Quadro Kanban e Timeline:**
   * Exibem as tarefas da agência filtradas por etapa e progresso do CRM. A ordenação e visibilidade das colunas do Kanban são controladas individualmente e persistidas localmente no `localStorage` do dispositivo.
2. **Calendário Geral da Agência (`/calendar`):**
   * Agrega reuniões do CRM, datas de embarques e check-in de pacotes de viagens contratados. Os filtros na barra lateral permitem ao usuário alternar e isolar compromissos pessoais das atividades corporativas da agência.
