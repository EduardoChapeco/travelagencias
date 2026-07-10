# 02_DESIGN_TOKEN_AND_THEME_PIPELINE.md — Design Tokens e Pipeline de Temas

## Fluxo do Pipeline de Design
```
DESIGN.md (SSOT)
  └── design.css (@theme Tokens)
        └── styles.css (Component Mappings)
              └── AppShell & Primitives
```

## Tokens de Geometria e Layout Utilizados
- `--shell-edge-gap`: `12px` (afastamento do limite externo da tela)
- `--shell-content-gutter`: `16px` (espaçamento entre sidebar e workspace)
- `--shell-header-height`: `44px` (altura máxima da barra de status)
- `--shell-page-padding`: `24px` (margem padrão interna das páginas)
- `--dock-collapsed-width`: `60px` (largura máxima do sidebar compactado)
- `--dock-radius`: `var(--radius-full)` (arredondamento completo das extremidades)

## Padrões de Altura Unificados para Controles do Header
- **Controles**: `h-8` (`32px`) para Busca, Botões de Filtro, e Barra Horizontal.
- **Botões Internos de Filtro**: `h-7` (`28px`) centralizados verticalmente em container de `h-8`.
- **Right Island**: `h-8` (`32px`) para data, hora e notificações, mantendo exata simetria visual.
