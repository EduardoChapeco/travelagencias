# 42 Manifesto de Evidências Visuais

Este documento registra sistematicamente todas as capturas de tela e provas em tempo de execução (runtime/DOM) que comprovam a recuperação visual da interface do TravelOS.

## Localização das Provas
Todos os arquivos de imagem são armazenados sob o diretório:
`docs/frontend-ui-recovery/evidence/screenshots/`

---

## Índice de Capturas de Tela

| Rota / Tela Auditada | Viewport | Configuração Sidebar | Estado de Dados | Nome do Arquivo de Evidência | Commit Relacionado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/agency/exctsmo/daily-tasks` | 1920 × 1080 | Recolhida (52px) | Dados de Produção | `daily_tasks_desktop.png` | `d64329c` |
| `/agency/exctsmo/crm` | 1920 × 1080 | Expandida (184px) | Leads Reais | `crm_kanban_desktop.png` | `d64329c` |
| `/agency/exctsmo/support` | 1920 × 1080 | Recolhida (52px) | Tickets Reais | `support_tickets_list.png` | `d64329c` |
| `/agency/exctsmo/support/ticket-1`| 1920 × 1080 | Recolhida (52px) | Conversa aberta | `support_chat_view.png` | `d64329c` |
| `/agency/exctsmo/daily-tasks` | 390 × 844 | Drawer Fechado | Mobile Render | `daily_tasks_mobile.png` | `d64329c` |
| `/agency/exctsmo/crm` | 390 × 844 | Drawer Aberto | Mobile Kanban | `crm_accordion_mobile.png` | `d64329c` |

---

## Diretrizes para Registro de Provas Visuais
1. **Nomeação Estrita:** `nome_do_modulo_viewport.png`. Exemplo: `crm_kanban_desktop.png` ou `crm_kanban_mobile.png`.
2. **Qualidade Visual:** Capturas devem mostrar a barra status superior (`h-11`) e os limites externos da janela para provar a ausência de vazamento de barra de rolagem.
3. **Data e Hora:** A data de captura deve ser adicionada à descrição para garantir que reflete o estado mais recente do branch de trabalho.
