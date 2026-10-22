# Actualizar kit acceso PDF legibilidad Spec

## Why
El PDF descargable de "Kit Control de Acceso (Individuales)" no refleja el nuevo quinto acceso requerido ni su dispositivo asociado, y la sección visual de Control de Acceso presenta etiquetas de iconos con tamaño y nitidez insuficientes. Se requiere actualizar el contenido exportado y mejorar la legibilidad responsive de los textos sin romper la estructura actual del PDF ni la lógica de negocio del canvas.

## What Changes
- Actualizar el kit PDF de Control de Acceso para soportar y mostrar correctamente el bloque "Acceso 1, 2, 3, 4, 5" cuando corresponda.
- Incluir `BZL600N - 5` en la lista de dispositivos asociados y en el render visual del kit con el icono que corresponda dentro de "Kit Control de Acceso (Individuales)".
- Mantener la misma maquetación, jerarquía tipográfica y diseño general del PDF; solo se ajustan textos, numeración y composición del bloque para cinco accesos.
- Mejorar el render de etiquetas de iconos en la sección Control de Acceso aumentando legibilidad, nitidez y contraste, con comportamiento estable en desktop, tablet y móvil.
- Verificar accesibilidad visual básica del texto sobre los fondos de etiquetas y que el cambio no rompa la alineación responsive.
- Añadir o actualizar pruebas automatizadas del kit PDF y del render de etiquetas para evitar regresiones.

## Impact
- Affected specs: Exportación PDF de acceso, render de iconos/etiquetas en canvas de Control de Acceso.
- Affected code: `src/lib/pdf/export.ts`, `src/lib/pdf/accessExportGrouping.ts`, `src/lib/pdf/accessExportGrouping.test.ts`, `src/lib/pdf/export.fixes.test.ts`, `src/components/cctv/CCTVCanvas.tsx`, `src/lib/access/device.ts`, pruebas relacionadas y, si aplica, `src/lib/access/iconRegistry.ts`.

## ADDED Requirements
### Requirement: Kit PDF de acceso con quinto dispositivo
El sistema SHALL permitir que el bloque de detalle "Kit Control de Acceso (Individuales)" represente cinco accesos en un mismo grupo cuando el kit incluya cinco dispositivos asociados definidos para ese bloque.

#### Scenario: Grupo único con cinco accesos
- **WHEN** el kit individual de control de acceso contiene los dispositivos `SenseFace 7A - 1`, `K11 - 2`, `SS2422EX-ES - 3`, `MAG600BZ - 4` y `BZL600N - 5`
- **THEN** el PDF muestra el título `Acceso 1, 2, 3, 4, 5`
- **AND** la lista de dispositivos asociados incluye los cinco nombres en el orden esperado
- **AND** el render visual del bloque incluye la representación gráfica correspondiente al quinto dispositivo

### Requirement: Estructura estable del PDF
El sistema SHALL conservar la estructura, formato y diseño general del PDF de Control de Acceso mientras actualiza el contenido textual y gráfico del kit.

#### Scenario: Actualización sin rediseño
- **WHEN** el usuario descarga el PDF actualizado
- **THEN** la portada, encabezados, bloques, estilos y composición general se mantienen coherentes con la versión actual
- **AND** solo cambian los textos, numeración y elementos gráficos necesarios para reflejar los cinco accesos

### Requirement: Etiquetas de acceso legibles y nítidas
El sistema SHALL renderizar las etiquetas de los iconos de dispositivos de Control de Acceso con tamaño mínimo legible, mejor definición de fuente y contraste suficiente sobre su fondo.

#### Scenario: Legibilidad en distintos tamaños de pantalla
- **WHEN** el usuario visualiza la sección Control de Acceso en desktop, tablet o móvil
- **THEN** los textos descriptivos sobre los iconos se perciben nítidos y sin pixelación evidente
- **AND** el tamaño de fuente no cae por debajo de un umbral legible
- **AND** el contraste entre fondo y texto es suficiente para lectura clara

### Requirement: Responsividad y alineación conservadas
El sistema SHALL mantener la alineación y composición responsive de los iconos de acceso al incrementar legibilidad de las etiquetas.

#### Scenario: Sin ruptura de layout
- **WHEN** se renderizan iconos y etiquetas con la mejora tipográfica
- **THEN** las etiquetas permanecen alineadas con su dispositivo
- **AND** no se superponen de forma inesperada por el cambio de tamaño base
- **AND** el flujo visual de la sección no se rompe en resoluciones comunes

### Requirement: Validación automatizada del kit y etiquetas
El sistema SHALL incluir pruebas automatizadas que verifiquen el agrupamiento del kit PDF actualizado y la configuración base de legibilidad de etiquetas en Control de Acceso.

#### Scenario: Pruebas de regresión
- **WHEN** se ejecutan las pruebas del módulo de PDF y de acceso
- **THEN** el agrupamiento y el contenido del kit reflejan correctamente cinco accesos
- **AND** los valores por defecto de tipografía/estilos de etiquetas cumplen el nuevo estándar mínimo definido

## MODIFIED Requirements
### Requirement: Agrupación de kits de Control de Acceso
La lógica de agrupación de detalle para "Kit Control de Acceso (Individuales)" DEBERÁ soportar configuraciones específicas del kit que agrupen cinco dispositivos asociados dentro del primer bloque cuando así lo requiera la plantilla de exportación.

### Requirement: Render de etiquetas de accessDevices
El render de etiquetas de `accessDevices` DEBERÁ priorizar legibilidad y nitidez, manteniendo compatibilidad con propiedades existentes como `labelVisible`, `labelFontFamily`, `labelFontWeight`, `labelFontStyle` y offsets.

## REMOVED Requirements
No aplica.
