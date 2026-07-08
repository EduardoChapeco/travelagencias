# UI-004 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-004

## 1. Evidência no Código
Ao inspecionar o arquivo [ModuleToolbar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ModuleToolbar.tsx), identificou-se:

* **Largura dos Filtros:** Na linha 99, a div contêiner das pílulas possui limites rígidos de largura:
  ```tsx
  <div className="flex items-center gap-0.5 glass-pill p-0.5 overflow-x-auto no-scrollbar max-w-[320px] sm:max-w-md shrink-0">
  ```
  Se houver muitos filtros em viewports menores que `sm`, a largura máxima é truncada em `320px` e causa a sensação de corte das pílulas se o usuário não rolar horizontalmente.
* **Sobreposição no Header:** Em [AppShell.tsx:L203](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/AppShell.tsx#L203), a div central que renderiza a `{toolbar}` tem a propriedade `flex-1 flex justify-center`, mas como a barra superior não impõe limites nos contêineres laterais, a toolbar central pode colidir com as extremidades caso a busca (`w-44`/`w-56`), o título do módulo e as pílulas de filtro se estendam simultaneamente.
* **Ações sem Ícone/Texto e Contraste:** No arquivo [ModuleToolbar.tsx:L130](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ModuleToolbar.tsx#L130), a div de ações secundárias é envolta pela classe `.glass-pill` sem herança explícita de cores de texto, fazendo com que botões repassados como children possam apresentar contrastes inadequados (como texto cinza sobre fundo escuro).

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (Os limites estruturais de flexibilidade e a largura dos contêineres de filtro em `ModuleToolbar` de fato propiciam cortes e colisões).
