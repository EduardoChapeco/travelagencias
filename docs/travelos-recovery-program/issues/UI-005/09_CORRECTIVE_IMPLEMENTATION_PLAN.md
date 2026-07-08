# UI-005 - 09_CORRECTIVE_IMPLEMENTATION_PLAN.md
# PLANO DE IMPLEMENTAÇÃO CORRETIVA - UI-005

Este documento define as diretrizes para corrigir a compressão de textos na Home pública.

---

## 1. Escopo de Mudanças

* **Componente:** [index.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/index.tsx) e [p.$agency_slug.index.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/routes/p.$agency_slug.index.tsx)
* **Alteração Técnica:**
  * Isolar a landing page pública sob compositions próprias e foundations limpas, garantindo que seletores globais não atinjam tags sem classe explícita.
  * Verificar e ajustar a resolução do caminho da diretiva `@source` do Tailwind em `styles.css` para certificar-se de que a leitura de classes em tempo de build compile perfeitamente em sistemas Windows.
  * Injetar classes inline seguras (`w-full`, `max-w-4xl`, etc.) de forma explícita com fallbacks no `design.css` caso as regras utilitárias falhem.
