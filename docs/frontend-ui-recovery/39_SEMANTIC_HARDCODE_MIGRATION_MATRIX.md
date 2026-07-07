# 39 Matriz de Migração Semântica de Hardcodes

Este documento cataloga todos os valores de estilo inline/hardcoded identificados no código fonte da TravelOS e define os mapeamentos canônicos para variáveis de layout e tokens semânticos do Design System.

## Classificação Semântica de Arredondamento (Border Radius)

| Padrão Identificado | Categoria Semântica | Token Canônico Substituível | Exemplo de Arquivo/Linha | Estado da Migração |
| :--- | :--- | :--- | :--- | :--- |
| `rounded-[32px]` | **Modal / Dialog / Sheet** | `rounded-[var(--radius-sheet)]` | `AppShell.tsx:295` | 🟡 PENDENTE |
| `rounded-[32px]` | **Customizer Desktop** | `rounded-[var(--radius-sheet)]` | `AppShell.tsx:295` | 🟡 PENDENTE |
| `rounded-[32px]` | **Formulário de Login** | `rounded-[var(--radius-sheet)]` | `auth.login.tsx:155` | 🟡 PENDENTE |
| `rounded-[20px]` | **Popover / Tooltip** | `rounded-[var(--radius-card)]` | `popover.tsx:22` | ✅ CONCLUÍDO |
| `rounded-[20px]` | **Dropdown Menu** | `rounded-[var(--radius-card)]` | `dropdown-menu.tsx:49` | ✅ CONCLUÍDO |
| `rounded-[20px]` | **Select Primitives** | `rounded-[var(--radius-card)]` | `select.tsx:71` | ✅ CONCLUÍDO |
| `rounded-[14px]` | **Sidebar Flutuante** | `rounded-[var(--radius-card)]` | `DynamicIslandNav.tsx:268` | 🟡 PENDENTE |
| `rounded-[40px]` | **Mockup do Device** | *Exceção Permitida (Phone Frame)* | `DevicePreview.tsx:46` | ✅ EXCEÇÃO OK |

---

## Classificação Semântica de Layout e Dimensões

| Padrão Identificado | Categoria Semântica | Token Canônico Substituível | Exemplo de Arquivo/Linha | Estado da Migração |
| :--- | :--- | :--- | :--- | :--- |
| `w-[52px]` | **Sidebar Collapsed Width** | `w-[var(--shell-primary-nav-width)]` | `DynamicIslandNav.tsx:303` | ✅ CONCLUÍDO |
| `pt-11` | **Content Header Offset** | `pt-[var(--shell-header-height)]` | `AppShell.tsx:227` | ✅ CONCLUÍDO |
| `h-11` | **Status Bar Height** | `h-[var(--shell-header-height)]` | `AppShell.tsx:182` | ✅ CONCLUÍDO |
| `max-h-[calc(100vh-8rem)]`| **Inbox Message Area** | `max-h-[calc(100vh-var(--shell-header-height)-4rem)]` | `agency.$slug.inbox.tsx:801` | 🟡 PENDENTE |

---

## Mapeamento de Estilos Glassmorphism e Transparências

| Padrão Identificado | Categoria Semântica | Token Canônico Substituível | Exemplo de Arquivo/Linha | Estado da Migração |
| :--- | :--- | :--- | :--- | :--- |
| `bg-white/5` | **Fundo Transparente Médio**| `bg-[var(--os-glass-bg)]` | `LeadCard.tsx:99` | 🟡 PENDENTE |
| `border-white/10` | **Borda Transparente Fina** | `border-[var(--os-glass-border)]` | `alert-dialog.tsx:37` | 🟡 PENDENTE |
| `bg-black/60` | **Modal Overlay Dimmer** | `bg-[var(--os-dimmer-bg)]` | `alert-dialog.tsx:19` | 🟡 PENDENTE |
| `backdrop-blur-sm` | **Overlay Backdrop Blur** | `backdrop-blur-[var(--os-overlay-blur)]` | `sheet.tsx:49` | 🟡 PENDENTE |
