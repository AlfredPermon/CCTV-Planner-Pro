# Exportación PDF: Orientación y Escalado Uniforme

Este documento describe el manejo de orientación y el algoritmo de escala uniforme (scale-to-fit) implementado para evitar deformaciones al exportar PDFs en “CCTV Planner Pro”.

## Orientación
- La orientación se configura desde el diálogo “Exportar a PDF” (Vertical u Horizontal).
- Se pasa al motor jsPDF mediante `PdfOptions.orientation`.

## Escalado Uniforme (scale-to-fit)
- La composición del diseño (planos, cámaras, dispositivos, etiquetas) se realiza en un canvas base de 800×600.
- Se calcula un único factor de escala `s = min(targetW/800, targetH/600)` y se aplican offsets para centrar:
  - `offsetX = (targetW - 800*s)/2`
  - `offsetY = (targetH - 600*s)/2`
- Todas las posiciones y tamaños se transforman uniformemente:
  - `x' = offsetX + x*s`
  - `y' = offsetY + y*s`
  - tamaños (radios, fuentes, grosores) escalan con `s`.

## Calidad de Imágenes
- Se usa `imageSmoothingQuality = 'high'` en canvas y `toDataURL('image/png', imageQuality)` en la conversión.
- Se preserva la relación de aspecto del plano y de las imágenes incrustadas.

## Márgenes y Espaciado
- Los márgenes internos del diseño (boundsX/boundsY) y los offsets de etiquetas se escalan con `s`, manteniendo proporciones.

## Recortes de Cámaras Individuales
- El canvas de diseño expone metadatos `_transform = { scale, offsetX, offsetY }`.
- Los recortes por cámara usan estos metadatos para mapear coordenadas con exactitud y evitar desplazamientos.

## API Relevante
- `renderDesignCanvas(data, targetW, targetH, mode)` — renderiza el diseño con escala uniforme y centrado.
- `computeUniformTransform(baseW, baseH, targetW, targetH)` — helper exportado para calcular `scale` y offsets.

## Buenas Prácticas
- Mantener `imageQuality` alto para evitar pixelación.
- Ajustar márgenes del PDF (`PdfOptions.margin*`) según la plantilla y el contenido.
