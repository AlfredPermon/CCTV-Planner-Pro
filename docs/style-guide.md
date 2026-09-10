# Guía de Estilo – CCTV Planner Pro

## Tipografía
- Primaria: Inter
- Jerarquía:
  - Títulos de catálogo: Semibold 16px
  - Nombres de modelo: Medium 14px
  - Especificaciones: Regular 12px

## Paleta de Colores
- Primario: var(--color_primario, var(--primary))
- Secundario 1: var(--color_secundario_1, var(--secondary))
- Secundario 2: var(--color_secundario_2, var(--accent))
- Fondo: var(--color_fondo, var(--background))
- Texto principal: var(--color_texto_principal, var(--foreground))
- Texto secundario: var(--color_texto_secundario, var(--muted-foreground))

## Iconografía
- Lucide: Camera, BadgeCheck, Megaphone, Flame
- Consistencia de tamaño: 16–24 px, color heredado de texto

## Componentes
- Acordeón lateral de catálogos
- Fichas de modelo en cuadrícula con botón “Agregar”
- Estados: hover, active, selected mediante clases Tailwind

## Espaciado y Bordes
- Sistema de 8px: gap-2 (8px), gap-4 (16px), p-2/p-4
- Bordes redondeados: 8px en tarjetas, 4px en botones

## Responsivo
- Panel lateral ≈20% en desktop (col-span-1/5)
- Área principal ≈80% (col-span-4/5)
- Adaptación tablet: grid md→lg, layout vertical en sm
