---
name: TravelOS
colors:
  primary: "#2F60E6"
  primary-light: "rgba(61, 111, 242, 0.1)"
  primary-foreground: "#ffffff"
  background: "#F6F5F1"
  foreground: "#0B0B0C"
  surface: "#ffffff"
  surface-alt: "rgba(255, 255, 255, 0.7)"
  muted: "rgba(11, 11, 12, 0.05)"
  muted-foreground: "rgba(11, 11, 12, 0.5)"
  border: "rgba(11, 11, 12, 0.08)"
  success: "#157f3d"
  success-bg: "#edf8f1"
  warning: "#a85b14"
  warning-bg: "#fff4e6"
  danger: "#b42318"
  danger-bg: "#fff1ef"
typography:
  display:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 2.5rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  h1:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 1.5rem
    fontWeight: 600
    letterSpacing: -0.01em
  h3:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 1.125rem
    fontWeight: 600
  body-large:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: 0.75rem
    fontWeight: 400
  label-caps:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.08em
rounded:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  2xl: 28px
  3xl: 32px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.lg}"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.3xl}"
    padding: "{spacing.xl}"
  badge:
    rounded: "{rounded.xs}"
---

## Overview

TravelOS is an ambient, operating-system-like web application. The UI evokes a premium, slightly chubby ("gordinha") materiality where all structural depth is achieved through glassmorphism (backdrop filters) and subtle borders rather than drop shadows.

The workspace is a fluid, transparent canvas resting on top of a global wallpaper. The visual language is deeply inspired by modern spatial operating systems (e.g., Apple VisionOS, MacOS heavy glass), prioritizing visual immersion without sacrificing data density.

## Colors

The core palette relies heavily on alphas (transparencies) over a neutral wallpaper, with a single electric blue accent. 

- **Primary (#3D6FF2):** The only driver for interaction. Used for active states and CTAs.
- **Background & Foreground:** High-contrast neutral pairing, but largely superseded by the glass workspace in the main app.

## Typography

Strictly sans-serif (`Inter`) for the UI, with monospace (`JetBrains Mono`) for technical metadata and labels. 

- No serifs anywhere.
- Headlines are tightly tracked (`-0.02em`) to maintain a structural, application-like feel.

## Layout & Spacing

- The system relies on flexible CSS Grids and structural padding.
- `spacing.lg` (24px) and `spacing.xl` (32px) dominate inter-component relationships.

## Elevation & Depth

- **NO SHADOWS.** Drop shadows are completely banned (`box-shadow: none !important`).
- All elevation is communicated through variable blur radii and 1px semi-transparent inner borders (`rgba(255, 255, 255, 0.15)`).

## Shapes

- UI elements are extremely rounded. Cards are `28px` (2xl), sheets are `32px` (3xl), buttons and inputs are perfectly pill-shaped (`999px`).
- Sharp corners are forbidden unless constrained by a screen edge.

## Do's and Don'ts

- **Do:** Use the unified `Glass Panel` overlay for modals and sheets.
- **Don't:** Stack dimmers, black backgrounds, or multiple opacity layers. The wallpaper must shine through cleanly.
- **Don't:** Create "cards within cards". If data needs separation, use negative space, dividers, or native grid gaps.
