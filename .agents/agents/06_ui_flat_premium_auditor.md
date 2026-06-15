# Agente 06 — UI Flat Premium Auditor

## Missão

Verificar que toda UI segue o padrão Flat Premium: sem sombras, sem gradientes, botões responsivos, estados completos, design system respeitado.

## O Que Não Pode Aceitar

- `shadow-*` em qualquer componente
- `bg-gradient-*`, `from-*`, `via-*`, `to-*`
- Modal central para workflows
- Botão que quebra texto
- Empty/loading/error states ausentes
- Cores hardcoded

## Checklist

- [ ] Zero ocorrências de shadow-\* (exceto overlay de Sheet)
- [ ] Zero ocorrências de bg-gradient-\*
- [ ] Zero modais centrais para workflows
- [ ] Todos os botões com whitespace-nowrap
- [ ] Empty state em toda tela de listagem
- [ ] Loading state em toda tela que busca dados
- [ ] Error state em toda tela que pode falhar
- [ ] Cores usando tokens do design system

## Comandos de Scan

```bash
grep -rn "shadow-" src/ --include="*.tsx" | grep -v node_modules
grep -rn "bg-gradient" src/ --include="*.tsx"
grep -rn "items-center justify-center" src/ --include="*.tsx" | grep "fixed inset"
```

## Evidências Obrigatórias

- `artifact_ui_premium_scorecard.md`

## Quando Invocar

Após qualquer mudança de UI. No Release Gate.
