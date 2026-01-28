---
name: "pdf-detail-pages-style-guide"
description: "Define layout, typographic hierarchy, grid and colors for cámaras detalle. Invoke when generating páginas 3+ en exportProfessionalPdf."
---

# Guía de Estilo: Detalle de Cámaras (Páginas 3+)

## Grid y Márgenes
- Márgenes de página: usar los definidos por opciones del PDF.
- Dos columnas por página: bloque izquierdo y derecho con un gutter de 12 mm entre columnas.
- Cada bloque: ancho = (contenido - gutter)/2, alto = área útil - 12 mm.
- Padding interno del bloque: 4 mm.
- Encabezado del bloque: 10 mm de alto, ocupa todo el ancho del bloque.
- Área de recorte de imagen: ~75% de la altura del bloque, inmediatamente bajo el encabezado.
- Área de descripción: ocupa el espacio restante y se ajusta con salto de línea.

## Tipografía
- Fuente: Helvetica.
- Jerarquía:
  - Título de sección: 14 pt, normal.
  - Etiqueta de bloque (Cámara N: Nombre): 12 pt, bold.
  - Descripción: 10 pt, normal.
  - Nota comparativa: 9 pt, italic.
  - Pie de página (numeración y fecha): 9 pt, normal.

## Colores
- Fondo del bloque izquierdo: #f6f8fb.
- Fondo del bloque derecho: #f8f6fb.
- Borde del bloque: #d9dee8.
- Encabezado del bloque izquierdo: #eaf0ff.
- Encabezado del bloque derecho: #f0eaff.
- Texto principal: #0f172a.
- Texto secundario/descripcion: #334155.

## Imagen y Calidad
- Resolución objetivo para recortes: ~300 DPI.
- Habilitar imageSmoothing y calidad alta al generar el canvas base.
- Aplicar filtro de nitidez suave para reforzar bordes y facilitar lectura al zoom.

## Etiquetado y Secuencia
- Etiqueta: "Cámara N: [nombre completo]"; N corresponde al índice secuencial (1-based).
- Posicionamiento de la etiqueta: dentro del encabezado del bloque, a la izquierda.
- Descripción: concisa e informativa, bajo el recorte, alineada a la izquierda y con ancho máximo del bloque.

## Nota Comparativa
- Si dos cámaras del mismo par cubren áreas contiguas o cercanas, incluir nota al pie del bloque con observación contextual.

## Encabezado y Pie por Página
- Encabezado de sección: "Detalle de Cámaras".
- Numeración de página y fecha: inferior derecha, formato "Página X • DD/MM/AAAA".

## Reutilización
- La función exportProfessionalPdf aplica esta plantilla de forma uniforme en todas las páginas de detalle.
- Para personalizar descripciones, provea un mapa opcional `cameraDescriptions: Record<string,string>` en el payload de exportación.
