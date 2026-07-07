# 08 CSS Cascade e Specificity

## Auditoria de Ordem de Carga
**Evidência Real Encontrada:** O arquivo `src/styles.css` serve como master entrypoint para o CSS e respeita rigorosamente a hierarquia do Tailwind v4:
1. `@import "tailwindcss" source(none);` e `@source "../src";` no topo do arquivo.
2. Seguido pelas camadas auxiliares de animação e dark mode.
3. `@import "./design.css";` injeta as variáveis de cor e espaçamento usando a diretiva nativa `@theme`.
4. Os componentes Glassmorphism (`.glass`, `.glass-sidebar`) vêm no final, utilizando `@layer utilities`.
**Status:** CORRETO. A hierarquia previne conflitos de especificidade.

## Variáveis Estáticas vs Tailwind v4
**Evidência Real Encontrada:**
- O arquivo vazio e sem uso `theme.css` foi deletado.
- `styles.css` NÃO contém variáveis `--color-*` em seu `:root`.
- A única autoridade para cores e tipografia de base é o bloco `@theme` no arquivo `design.css`.
- Regras residuais problemáticas foram expurgadas (ex: `padding-left: 60px` no `.os-workspace` que conflituava com o Grid nativo).

**Status:** CONSOLIDADO. O sistema de cores está 100% atrelado à engine do Tailwind v4..md
