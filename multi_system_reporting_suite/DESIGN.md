---
name: CCTV Planner Pro
colors:
  surface: '#f8f9ff'
  surface-dim: '#c2dcff'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e5efff'
  surface-container-high: '#dbe9ff'
  surface-container-highest: '#d1e4ff'
  on-surface: '#133454'
  on-surface-variant: '#436183'
  inverse-surface: '#010f1f'
  inverse-on-surface: '#8f9eb3'
  outline: '#5f7da0'
  outline-variant: '#96b4da'
  surface-tint: '#0762a4'
  primary: '#0762a4'
  on-primary: '#f7f9ff'
  primary-container: '#94c4ff'
  on-primary-container: '#003e6d'
  inverse-primary: '#71b2fa'
  secondary: '#44674f'
  on-secondary: '#e7ffea'
  secondary-container: '#cef5d6'
  on-secondary-container: '#3c5e47'
  tertiary: '#0d6e36'
  on-tertiary: '#e8ffe7'
  tertiary-container: '#a6ffb7'
  on-tertiary-container: '#00652f'
  error: '#ac3434'
  on-error: '#fff7f6'
  error-container: '#f56965'
  on-error-container: '#65000b'
  primary-fixed: '#94c4ff'
  primary-fixed-dim: '#78b7ff'
  on-primary-fixed: '#00294a'
  on-primary-fixed-variant: '#00477b'
  secondary-fixed: '#cef5d6'
  secondary-fixed-dim: '#c0e6c8'
  on-secondary-fixed: '#2a4b36'
  on-secondary-fixed-variant: '#466851'
  tertiary-fixed: '#a6ffb7'
  tertiary-fixed-dim: '#98f0aa'
  on-tertiary-fixed: '#005024'
  on-tertiary-fixed-variant: '#107037'
  primary-dim: '#005592'
  secondary-dim: '#395a44'
  tertiary-dim: '#00602d'
  error-dim: '#70030f'
  background: '#f8f9ff'
  on-background: '#133454'
  surface-variant: '#d1e4ff'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  edge-margin: 24px
  gutter: 16px
  panel-padding: 12px
  stack-gap: 8px
---

## Brand & Style
The design system is engineered for technical precision, catering to engineers, project managers, and low-voltage technicians. The brand personality is authoritative, systematic, and reliable, reflecting the critical nature of safety and security infrastructure planning.

The visual style follows a **Corporate / Modern** aesthetic with **Expressive** leanings, shifting from a purely utilitarian feel to one that is more approachable and vibrant. It utilizes a structured interface that prioritizes data density and clarity. The environment is designed to feel like a modern, high-end professional suite—focused and utility-driven, but with a refined palette that reduces the "industrial" coldness of traditional CAD tools.

## Colors
This design system defaults to a **Light Mode**, providing a clean, paper-like workspace that feels familiar to users transitioning from physical blueprints or standard office documentation.

- **Primary (#337ABE):** A vibrant blue used for primary actions, active states, and selection highlights. It signals "Technical Control" with improved visibility on light surfaces.
- **Success/Tertiary (#30874C):** Reserved for system "Online" statuses, completed inspections, and validated configurations.
- **Base/Background (#F9F9FB):** The clean, neutral foundation for the workspace.
- **Surfaces:** Soft gray and slate variations (based on #69788C) are used to differentiate sidebars, property panels, and toolbars from the main canvas.

## Typography
The typography is centered on **Inter** for its exceptional legibility in dense UI environments. To reinforce the technical nature of the application, **JetBrains Mono** is introduced for labels, coordinates, IP addresses, and hardware specifications.

- **Headlines:** Use Inter with tighter letter-spacing for a professional, "locked-in" feel.
- **Body:** Inter provides a neutral, high-readability experience for reports and descriptions.
- **Data Labels:** Monospaced JetBrains Mono is used for all alphanumeric technical data (e.g., Mac addresses, voltage readings) to ensure vertical alignment in lists and tables.

## Layout & Spacing
The layout utilizes a **Fixed Sidebar + Fluid Canvas** model. The central workspace (canvas) expands to fill the viewport, while property panels and toolbars are fixed to the edges to provide a consistent "cockpit" experience.

- **Grid:** A 4px baseline grid governs all internal component spacing.
- **Panels:** Collapsible sidebars (Left: System Tree; Right: Properties) use a 12px internal padding to maximize data density without feeling cramped.
- **Tables:** Data-heavy reports use 8px cell padding and subtle horizontal dividers to maintain row scan-ability across large datasets.

## Elevation & Depth
In this light-mode design system, depth is communicated through **Tonal Layers** and subtle contrast shifts, maintaining an industrial, clean aesthetic.

- **Level 0 (Base):** #F9F9FB (Main background).
- **Level 1 (Panels):** #F3F3F5 (Sidebars and toolbars).
- **Level 2 (Active Elements):** #EEEEEF (Hovered items or active menu flyouts).
- **Outlines:** Instead of heavy shadows, components use 1px "low-contrast outlines" using the Neutral variable (#69788C) at reduced opacity to define boundaries. Shadows are only used for modal overlays, appearing as soft, professional blurs.

## Shapes
The shape language is "Soft" yet disciplined. Standard UI elements like buttons and input fields use a **0.25rem (4px) corner radius**, providing a modern touch without losing the professional, rigid feel required of a technical tool.

- **Interactive Elements:** 4px radius.
- **Large Containers:** 8px (rounded-lg) for main workspace cards or modal windows.
- **Status Indicators:** Icons and status pips remain sharp or perfectly circular to stand out against the rectilinear grid.

## Components
Consistent styling of the toolset ensures a unified professional experience.

- **Buttons:** Primary buttons are solid Blue (#337ABE) with white text. Secondary buttons use a slate-gray ghost style with a 1px border. All labels are uppercase Inter (12px Bold).
- **Input Fields:** Lighter than the panel color with a 1px neutral border. Upon focus, the border shifts to the primary blue. Technical inputs (dimensions, IP addresses) use the monospaced label font.
- **Lists & Data Grids:** Zebra-striping is avoided in favor of 1px border-bottom separators. Row hover states use a subtle tonal shift.
- **Chips:** Small, rectangular tags with 2px radius for "System Type" (CCTV, Fire, etc.). Each system type has a dedicated color-coded left border using the expressive tertiary colors.
- **Hardware Cards:** Compact cards with a 1px border. They include a small thumbnail of the hardware and a "Specs" button that triggers a side-panel drill-down.
- **Status Pips:** Small circles used for online/offline states. Pulsing animations are used sparingly for active alarms or errors.