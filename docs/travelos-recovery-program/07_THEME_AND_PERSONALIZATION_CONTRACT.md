# Contrato de Tema e Personalização

Atualizado em 2026-07-10.

## Fonte persistida

As preferências de desktop são lidas e gravadas em `profiles.preferences` por
`src/hooks/use-desktop-theme.ts`.

## Estado canônico atual

- `wallpaper`: URL do papel de parede.
- `blurIntensity`: intensidade de desfoque.
- `dimOpacity`: opacidade do dimmer.
- `glassOpacity`: opacidade das superfícies glass.
- `setTheme`, `loadTheme`, `saveTheme`: comandos do store.

## Consumidores

- `AppShell`: aplica wallpaper, dimmer e variáveis do workspace.
- `DesktopCustomizerModal`: edita e persiste preferências.

## Duplicidade aberta

`useLayoutStore.backgroundImage` sobrepõe conceitualmente `wallpaper`, mas seu setter
não possui consumidor. Nenhum novo fluxo deve usar `backgroundImage`; a remoção será
feita junto da unificação dos stores.
