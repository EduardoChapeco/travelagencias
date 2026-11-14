---
name: JAH-V4-TravelOS
colors:
  primary: "#ffffff"
  primary-light: "rgba(255, 255, 255, 0.12)"
  primary-foreground: "#000000"
  brand: "#ffffff"
  brand-foreground: "#000000"
  accent: "#f59e0b"
  accent-foreground: "#000000"
  background: "#0a0b0e"
  foreground: "#f8fafc"
  surface: "#12141c"
  surface-alt: "#181b24"
  muted: "rgba(255, 255, 255, 0.06)"
  muted-foreground: "#a1a1aa"
  border: "rgba(255, 255, 255, 0.08)"
  border-subtle: "rgba(255, 255, 255, 0.04)"
  success: "#10b981"
  success-bg: "rgba(16, 185, 129, 0.12)"
  warning: "#f59e0b"
  warning-bg: "rgba(245, 158, 11, 0.12)"
  danger: "#ef4444"
  danger-bg: "rgba(239, 68, 68, 0.12)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.025em
  h1:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 1.375rem
    fontWeight: 600
    letterSpacing: -0.015em
  h3:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 1.125rem
    fontWeight: 600
  body-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 0.75rem
    fontWeight: 500
  label-caps:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.06em
rounded:
  xs: 6px
  sm: 8px
  md: 10px
  lg: 12px
  xl: 14px
  2xl: 16px
  3xl: 20px
  full: 999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  badge:
    rounded: "{rounded.full}"
---

## 1. Princípios do Design System JAH V4 no TravelOS

O TravelOS opera sob uma divisão clara entre **Shell Multitarefa (Home / Desktop)** e **Módulos Operacionais de Alta Produtividade (Janelas Internas)**:

1. **Desktop / Shell Multitarefa**:
   - Wallpaper global nítido com Dock inferior e atalhos rápidos.
   - Preservação integral do layout espacial do sistema operacional.

2. **Janelas & Módulos Internos (Padrão JAH V4)**:
   - **Superfícies Claras/Neutras & Sólidas**: Fundo sólido `#171b26` (no dark mode) ou `#ffffff` (no light mode).
   - **Bordas Sutis de 1px**: `border border-white/10` no dark mode e `border border-slate-200` no light mode.
   - **Raios Contidos (10-12px a 16px)**: Squircles contidos e harmoniosos, sem brutalismo ou arredondamentos gigantescos fora de botões pill.
   - **Tipografia Escaneável**: `Outfit` para cabeçalhos marcantes, `Inter` para leitura corporal e `JetBrains Mono` com `tabular-nums` para valores monetários, datas e localizadores.
   - **Hierarquia Silenciosa**: Zero sombras decorativas (`box-shadow: none !important`), zero gradientes caóticos e eliminação de vidros pesados nos formulários.
   - **Edição em 4 Profundidades**: Cell ➔ Row ➔ Side-Panel (Drawer) ➔ Full-Page.
   - **Truthful Preview**: Prévia em tempo real fiel à experiência final do cliente (orçamentos, propostas e vouchers).
   - **Touch Targets Mínimos (44px)**: Botões, seletores e links mobile com área de toque mínima de 44x44px.

