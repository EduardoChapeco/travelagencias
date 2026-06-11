# Workflow 03 — UI Refactor

## Gatilho
Quando o usuário pede para melhorar design, arrumar alinhamento, deixar premium.

## Etapas Específicas
1. **UI Audit:** Invocar `06_ui_flat_premium_auditor.md`.
2. **Limpeza de Classes:**
   - Remover `shadow-*`
   - Remover `bg-gradient-*`
   - Remover modais centrais `items-center justify-center`
3. **Conversão para Padrão:**
   - Transformar modais em `<Sheet>`
   - Aplicar `whitespace-nowrap` em botões
4. **States Check:** Garantir loading e empty states na nova UI.
5. **Build Check:** Garantir que as mudanças de classes não quebraram imports.
6. Executar `workflow_10_release_gate.md`.
