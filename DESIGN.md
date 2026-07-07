---
version: "alpha"
name: "Turis OS"
description: "Visual identity specification for Turis OS B2B tourism platform. Built on frosted glassmorphic ambient styling with high contrast solid interactive cues and unified structural dimensions."
dials:
  DESIGN_VARIANCE: 6          # Clean, symmetrical layouts with contextual asymmetry
  MOTION_INTENSITY: 5         # Tactile spring hover feedback & scroll reveals
  VISUAL_DENSITY: 4           # Clear, readable grids with spacious table layouts
colors:
  primary: "#3D6FF2"          # Brand active blue used for key calls to action and active accents
  ink: "#0B0B0C"              # Dark ink for prominent text, headings, and definite actions
  neutral: "#F6F5F1"          # Crisp, light paper fallback canvas when wallpaper is disabled
  glass-light: "rgba(255, 255, 255, 0.14)"
  glass-dark: "rgba(10, 10, 12, 0.35)"
  accent-lime: "#B6F24C"      # High contrast lime pop for badges and specific data metrics
  success: "#16a34a"          # Solid success badge green for high contrast readability
  warning: "#d97706"          # Solid warning badge orange
  danger: "#e11d48"           # Solid danger badge red
  info: "#2563eb"             # Solid info badge blue
typography:
  display:
    fontFamily: "Inter"
    fontSize: "2.5rem"
    fontWeight: 600
    letterSpacing: "-0.02em"
    lineHeight: "1.1"
  body-md:
    fontFamily: "Inter"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5"
  label-caps:
    fontFamily: "JetBrains Mono"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  "2xl": 28px
  "3xl": 32px
  full: 999px
  card: 28px
  sheet: 32px
  button: 999px
  input: 999px
  badge: 8px
spacing:
  xs: 8px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    height: "39px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    height: "39px"
  input-text:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    height: "42px"
  textarea:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    minHeight: "85px"
  status-badge:
    rounded: "{rounded.badge}"
    fontSize: "10px"
    fontWeight: "bold"
  card:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.glass-light}"
  sheet:
    rounded: "{rounded.sheet}"
---

## Overview

Turis OS is an ambient desktop-like platform interface. The canvas floats frosted glass panels over user-selected, high-resolution photography themes. There are no box shadows. Layout hierarchy is expressed cleanly using backdrop blur, border-light highlights, and subtle background opacity shifts.

## Colors

All UI elements must inherit color styling from locked palette tokens. No ad-hoc background inverting or mesh glows.

- **Primary Blue (#3D6FF2):** Primary active brand element. Guides active sidebar icons and main submit CTAs.
- **Solid Badges:** Status badges must use 100% solid colors. Muted transparent-on-transparent labels are prohibited as they collapse visually against variable wallpaper backdrops.

## Typography

Standardize font hierarchies to stop typographic drift.

- **Headlines:** Must use Geist or Inter Display. High contrast, tight tracking, with a minimum display leading of `1.1` for italic descender clearance (`y g j p q`).
- **Data Labels:** Small labels, column headers, and indicators must use JetBrains Mono wide caps (`label-caps`).

## Layout

Clean, mathematical layouts governed by visual density dials.

- **Responsive Grid:** CSS grids are mandatory for bento metrics and multi-item rows. No complex inline flexbox equations.
- **Full Fill Grids:** Table containers and workspaces must use `flex-1 min-h-0` to expand to 100% of the screen height, leaving no empty dead zones.
- **Sidebar Pill Dimensions:**
  - Width Collapsed: `52px` (plus `4px` offsets, totalling `60px` workspace padding).
  - Width Expanded: `184px` with spring motion transitions.

## Elevation & Depth

- **Shadow Ban:** Traditional box-shadow shadows are completely supressed.
- **Ambient Frosted Glass:** Use the class `.mac-glass-panel` for cards and components. Depth is achieved via `backdrop-filter: blur(22px) saturate(160%)` configured globally on the `.os-workspace` parent container.

## Shapes

- **Interactive Inputs:** Text inputs, select dropdowns, and button containers must be pill-shaped (`rounded-full` / `rounded-input` / `rounded-button`).
- **Cards & Textareas:** Structural tiles, kanban cards, lists, and multiline text boxes must use a radius of `28px` (`rounded-card`).
- **Sheets & Panel Modals:** Side slides and full modal containers must use `32px` (`rounded-sheet`).

## Components

Primitivos de interface must remain centralized inside `src/components/ui/form.tsx` and `src/components/ui/button.tsx`.

- **PrimaryButton / GhostButton:** Form buttons that reuse `Button` variants, preserving padding and sizing.
- **Input / Select / Textarea:** Input fields styled with base input tokens to ensure input height and shape are consistent across all forms.
- **StatusBadge:** Custom solid colored tags mapped directly to success, warning, danger, and info colors.

## Do's and Don'ts

### Do
- Use `.mac-glass-panel` for clean frosted glass wrappers in the workspace.
- Group long specification lists (N > 5) into clustered cards or snap pills.
- Align the AI Float button precisely with the sidebar width custom property (`--ds-sidebar-total`).

### Don't
- Do not use box-shadows or glow gradients.
- Do not let headlines wrap to more than 2 lines on desktop hero slots.
- Do not overlay small tag labels or metadata on top of photo assets.
- Do not use em-dashes `—` as formatting decorations; use standard typography or icons.
