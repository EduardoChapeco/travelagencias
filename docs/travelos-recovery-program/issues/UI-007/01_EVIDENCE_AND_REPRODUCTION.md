# UI-007 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - UI-007

## 1. Evidência no Código
Ao inspecionar o arquivo [Column.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/boarding/Column.tsx), identificou-se o seguinte erro de token na linha 22:

```tsx
    <div
      ref={setNodeRef}
      className={`flex h-full w-[310px] shrink-0 flex-col rounded-full border bg-surface/50 transition-all duration-300 ${
        isOver ? "border-brand bg-brand/5 scale-[1.01]" : "border-border/80"
      }`}
```

A classe `rounded-full` foi aplicada de forma inadequada à div que envolve toda a coluna do Kanban. Como as colunas possuem altura flexível e largura fixa de 310px, o navegador renderiza uma forma elíptica esticada (cápsula gigante). 

Além disso, na linha 49, o container de estado vazio também recebeu `rounded-full` de forma incorreta:
```tsx
<div className="flex h-24 items-center justify-center rounded-full border border-dashed ...">
```

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (A classe `rounded-full` está explicitamente codificada no wrapper da coluna e no placeholder vazio do Kanban de embarques).
