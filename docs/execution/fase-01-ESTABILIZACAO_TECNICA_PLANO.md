# Plano de Execução: Fase 1 — Estabilização Técnica e Design System Flat

**Autor:** Agente Técnico Antigravity  
**Data:** 19 de Junho de 2026

---

## 1. Problema Comprovado pela Auditoria

- **Sombras na UI:** Vários componentes e páginas usam classes de sombras (`shadow-sm`, `shadow-xl`, `shadow-md`, etc.) desrespeitando as diretrizes estritas de design plano _Light Editorial SaaS_ (que proíbe sombras).
- **Flicker do Brand Kit:** Ao carregar as rotas administrativas, as fontes e cores padrões aparecem brevemente antes que as consultas assíncronas do Supabase retornem as preferências personalizadas da agência.
- **Quebra de Fontes na Exportação (PDF/PNG):** O `html2canvas` é executado antes que as fontes importadas dinamicamente via Google Fonts estejam totalmente carregadas no DOM, gerando PDFs com fontes genéricas do sistema.
- **Build OOM:** O chunk size do Vite no build de produção excede limites que podem causar travamento por falta de memória (OOM).

---

## 2. Escopo Técnico

### O que será corrigido/refatorado:

1. **Sanidade Visual (Flat Design):**
   - Substituir classes `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-[...]` por `shadow-none` nos arquivos indicados na auditoria.
   - Revisar [styles.css](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/styles.css) para remover ou zerar as definições de sombra utilitárias.
2. **Qualidade Tipográfica (PDF/PNG):**
   - Injetar o trecho `await document.fonts.ready` antes do disparo de `html2canvas` nos arquivos:
     - [VoucherStudio.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/vouchers/VoucherStudio.tsx)
     - [ExportPdfButton.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/proposals/ExportPdfButton.tsx)
     - [pdf-generator.ts](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/pdf-generator.ts)
     - [agency.$slug.trips.$id.vouchers.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/routes/agency.$slug.trips.$id.vouchers.tsx)
     - [CardDetailPanel.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/components/boarding/CardDetailPanel.tsx)
3. **Flicker do Brand Kit:**
   - Ajustar [agency-context.tsx](file:///c:/Users/eduar/.gemini/antigravity-ide/scratch/travelagencias/src/lib/agency-context.tsx) para carregar imediatamente as variáveis CSS a partir de um cache síncrono no `localStorage` (se disponível) enquanto a consulta do Supabase carrega em background.
4. **Build OOM:**
   - Otimizar `vite.config.ts` se necessário para particionar pacotes grandes em chunks menores e evitar sobrecarga de memória do compilador.

### Tabelas/Schemas Afetados:

Nenhum.

### RLS/Policies Afetadas:

Nenhuma.

### Rotas e Componentes Afetados:

- `src/routes/agency.$slug.financial.reconciliation.tsx`
- `src/routes/agency.$slug.group-tours.$id.tsx`
- `src/routes/agency.$slug.suppliers.$id.tsx`
- `src/routes/agency.$slug.boarding.tsx`
- `src/routes/agency.$slug.suppliers.index.tsx`
- `src/routes/agency.$slug.design-system.tsx`
- `src/lib/agency-context.tsx`
- `src/components/vouchers/VoucherStudio.tsx`
- `src/components/proposals/ExportPdfButton.tsx`
- `src/lib/pdf-generator.ts`

---

## 3. Plano de Rollback e Critério de Pronto

- **Plano de Rollback:** Reverter alterações nos arquivos modificados usando `git checkout -- <arquivos>`.
- **Critério de Pronto:**
  1. Sucesso no build local (`npm run build`) e validação de tipagem (`npm run typecheck`).
  2. Nenhuma classe de sombra ativa nas telas principais modificadas.
  3. PDFs exportados exibindo a tipografia correta do Brand Kit.
  4. Carregamento de marca instantâneo sem flicker.
