# UI-003 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-003

## 1. Evidência no Código
* **Alinhamento do Dock:** Ao contrário das hipóteses iniciais, o dock horizontal inferior **está presente e é renderizado de forma intencional** pelo canvas de notas no arquivo [StickyNotesCanvas.tsx:L209-211](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/dashboard/StickyNotesCanvas.tsx#L209-211).
* **Ausência de Sidebar:** Em [AppShell.tsx:L217](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppShell.tsx#L217), a sidebar (`AppSidebar` / `DynamicIslandNav`) é explicitamente ocultada na Home:
  ```tsx
  {!isHome && !isBuilder && !isPastDue && (
    <div className="hidden md:flex flex-col justify-center items-start h-full pt-[var(--shell-header-height)] relative z-40">
      <AppSidebar ... />
    </div>
  )}
  ```
* **Ausência de Blur no Wallpaper:** A Home não recebe a classe `.os-workspace` do main contendo a opacidade de desfocagem do workspace.

## 2. Status de Classificação
**COMPORTAMENTO INTENCIONAL** (O dock inferior e a nitidez do plano de fundo na Home funcionam de acordo com as especificações, mas residem acoplados no Canvas de Notas).
