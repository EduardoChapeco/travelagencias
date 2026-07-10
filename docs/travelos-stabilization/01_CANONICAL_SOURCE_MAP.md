# 01_CANONICAL_SOURCE_MAP.md — Mapa de Fontes Canônicas

## Responsabilidade Única por Arquivo

| Recurso / Responsabilidade | Arquivo Canônico | Consumidores Principais |
| :--- | :--- | :--- |
| **Princípios de Design** | [DESIGN.md](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/DESIGN.md) | Equipe de Engenharia, IA |
| **Estilos Globais e Variáveis** | [src/styles.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) | Toda a aplicação |
| **Tokens CSS** | [src/design.css](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/design.css) | `styles.css` |
| **Estado de Layout e Ações** | [src/hooks/use-layout-store.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/hooks/use-layout-store.ts) | `PageHeader`, `AppSidebar` |
| **Registro de Navegação** | [src/lib/navigation.config.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/lib/navigation.config.ts) | `AppSidebar`, `AIFloatingWidget`, `DockNavigation` |
| **Shell Estrutural** | [src/components/shell/AppShell.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppShell.tsx) | Rotas de Módulos, Home |
| **Barra Lateral Integrada** | [src/components/shell/AppSidebar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppSidebar.tsx) | `AppShell` |
| **Contrato de Cabeçalho** | [src/components/shell/PageHeader.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/PageHeader.tsx) | Páginas de Módulos (Tasks, CRM, Financeiro, etc.) |
| **Controle de Roteamento** | [src/routeTree.gen.ts](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routeTree.gen.ts) | `router.tsx` |
