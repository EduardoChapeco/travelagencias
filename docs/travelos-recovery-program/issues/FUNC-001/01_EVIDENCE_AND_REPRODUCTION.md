# FUNC-001 - 01_EVIDENCE_AND_REPRODUCTION.md
# EVIDÊNCIAS E COMPROVAÇÃO DE REPRODUÇÃO - FUNC-001

## 1. Evidência no Código
Ao auditar o arquivo [ModuleToolbar.tsx](file:///c:/Users/Excelência Tour SMO/.gemini/antigravity-ide/scratch/travelagencias/src/components/shell/ModuleToolbar.tsx) na linha 149-158, identificou-se que o componente `ModuleActionButton` foi forçado a retornar `null`:

```tsx
export function ModuleActionButton({
  label,
  icon,
  onClick,
  className,
}: ModuleActionButtonProps) {
  // DEPRECATED: Retorna null pois as ações foram consolidadas dentro da ModuleToolbar (AppShell header slot).
  // Isso previne sobreposição com o DynamicIslandNav e limpa os hardcodes de offset.
  return null;
}
```

Isso remove de forma imediata todas as ações de criação em rotas que dependiam do `ModuleActionButton` e que não foram totalmente migradas para a propriedade `actions` do cabeçalho unificado `ModuleToolbar`.

## 2. Status de Classificação
**CONFIRMADO NO CÓDIGO** (O botão contextual foi forçado a retornar nulo de forma precoce na base de código).
