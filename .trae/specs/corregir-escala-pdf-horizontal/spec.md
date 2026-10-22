# Corrección de deformación en exportación PDF (Orientación Horizontal) Spec

## Why
La exportación a PDF en orientación Horizontal de “CCTV Planner Pro” deforma ligeramente el contenido. Se requiere mantener proporciones y calidad sin distorsión al cambiar la orientación.

## What Changes
- Auditar el módulo de exportación PDF y el manejo de orientación.
- Implementar escala uniforme (scale-to-fit) basada en relación de aspecto original.
- Aplicar la transformación de escala antes del render al PDF.
- Ajustar márgenes y espaciados de forma proporcional a la nueva orientación.
- Añadir validación de proporciones para textos, imágenes e ítems vectoriales.
- No se prevén cambios incompatibles (**no BREAKING**).

## Impact
- Afecta capacidades: Exportación PDF, selector de Orientación (ventana “Exportar a PDF”).
- Afecta código: Módulo/exportador PDF, funciones de transformación de coordenadas, composición de layout.

## ADDED Requirements
### Requirement: Escalado uniforme en orientación Horizontal
El sistema DEBERÁ aplicar una transformación de escala uniforme (scale-to-fit) que preserve el aspect ratio del contenido al exportar en orientación Horizontal, evitando cualquier deformación.

#### Scenario: Caso exitoso
- **WHEN** el usuario selecciona orientación “Horizontal” y exporta
- **THEN** el PDF se genera en Horizontal, con el contenido correctamente re-escalado, sin distorsión de proporciones, manteniendo calidad y posiciones relativas.

## MODIFIED Requirements
### Requirement: Manejo de orientación en exportación PDF
Al cambiar a orientación Horizontal, el motor de exportación DEBERÁ:
- Calcular el factor de escala con base en las dimensiones del contenido y del tamaño de página destino.
- Aplicar la escala uniforme y ajustar márgenes/espaciado proporcionalmente.
- Garantizar que textos, imágenes y vectores mantengan su relación de aspecto y nitidez.

## REMOVED Requirements
No aplica. No se elimina funcionalidad existente.
