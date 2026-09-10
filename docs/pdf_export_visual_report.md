# Reporte Visual de Validación (Antes/Después)

Este documento guía la comparación visual del exportador PDF tras la corrección de deformación en orientación Horizontal.

## Procedimiento
1. Preparar un proyecto que incluya:
   - Plano técnico con relación de aspecto no 4:3
   - Íconos de cámaras con etiquetas
   - Dispositivos de acceso/voceo/incendio
2. Generar dos exportaciones:
   - Antes (commit previo a la corrección)
   - Después (build actual con corrección)
3. Usar las mismas `PdfOptions` en ambas:
   - orientation: `landscape` (Horizontal)
   - format: `a4` (o el formato objetivo)
   - márgenes: valores por defecto del diálogo
4. Comparar:
   - Proporciones de elementos (círculos, rectángulos, arcos/FOV)
   - Legibilidad y tamaños de texto
   - Calidad de imágenes (sin pixelación visible)
   - Posición relativa de cámaras/dispositivos respecto al plano
   - Márgenes y espaciado dentro de la página

## Evidencia
- Adjuntar capturas o extractos de páginas correspondientes.
- Señalar con anotaciones cualquier diferencia observada.
- Confirmar “sin deformación” y “proporciones correctas” en Horizontal.

## Observaciones
- Variaciones menores por antialiasing son esperables; no deben afectar proporción.
- Para resoluciones diferentes, repetir el procedimiento y validar consistencia.
