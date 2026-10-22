# Fortalecer exportacion PDF precisa Spec

## Why
La exportacion desde la ventana "Exportar a PDF" presenta inconsistencias visuales en la representacion de dispositivos sembrados sobre el plano, lo que provoca perdida de precision espacial y omision parcial de algunos elementos. Se requiere reforzar la fidelidad entre el lienzo 2D y el PDF exportado, agregando validaciones previas y una vista previa confiable sin alterar la logica de negocio.

## What Changes
- Unificar el mapeo espacial entre el lienzo 2D y el render de exportacion PDF para conservar la ubicacion exacta de camaras, control de acceso, voceo, incendio y parquimetro.
- Garantizar escalado uniforme y preservacion estricta de proporciones del plano arquitectonico en la exportacion y en la previsualizacion.
- Validar antes de exportar que ningun dispositivo quede fuera de limites, que la escala usada sea coherente y que cada tipo de dispositivo tenga representacion grafica completa y legible.
- Ajustar la vista previa de la ventana "Exportar a PDF" para que refleje el resultado real esperado antes de descargar el archivo.
- Incorporar pruebas automatizadas de precision espacial con tolerancia maxima de error del 1% entre coordenadas originales y coordenadas exportadas.
- Mantener la logica de negocio existente; los cambios deben limitarse a la capa de exportacion, validacion y UI de previsualizacion.
- No se prevén cambios incompatibles (**no BREAKING**).

## Impact
- Affected specs: Exportacion PDF, validacion previa a exportacion, previsualizacion de documentos.
- Affected code: `src/lib/pdf/export.ts`, `src/lib/pdf/exportValidation.ts`, `src/lib/pdf/exportValidation.test.ts`, `src/components/export/ExportToPDFDialog.tsx`, generadores de datos de exportacion y render del lienzo.

## ADDED Requirements
### Requirement: Fidelidad espacial completa en exportacion PDF
El sistema SHALL exportar todos los dispositivos soportados en el PDF manteniendo su posicion relativa y absoluta respecto al plano arquitectonico del lienzo 2D, usando una transformacion espacial uniforme y consistente para todos los subsistemas soportados.

#### Scenario: Exportacion correcta de todos los dispositivos
- **WHEN** el usuario exporta un plano con camaras, dispositivos de acceso, voceo, incendio y parquimetro
- **THEN** todos los dispositivos incluidos en el snapshot de exportacion aparecen en el PDF final
- **AND** cada dispositivo conserva su ubicacion espacial dentro del plano exportado
- **AND** la exportacion no deforma el plano ni reubica elementos por subsistema

### Requirement: Preservacion estricta de proporciones del plano
El sistema SHALL mantener la proporcion original del plano arquitectonico y de la disposicion de los dispositivos durante el render de previsualizacion y durante la generacion final del PDF.

#### Scenario: Escalado sin deformacion
- **WHEN** el motor de exportacion adapta el plano al tamano del PDF o de la previsualizacion
- **THEN** aplica una unica escala uniforme basada en el area disponible
- **AND** conserva la relacion de aspecto original del plano
- **AND** evita clipping, estiramiento o compresion diferencial en cualquier eje

### Requirement: Validacion previa de integridad visual y espacial
El sistema SHALL ejecutar validaciones previas a la exportacion para detectar dispositivos fuera de limites, incoherencias de escala y representaciones graficas incompletas o ilegibles antes de permitir la descarga.

#### Scenario: Deteccion previa de errores de exportacion
- **WHEN** el usuario abre la ventana "Exportar a PDF" o actualiza la vista previa
- **THEN** el sistema valida la integridad espacial del plano y de todos los dispositivos seleccionados
- **AND** muestra advertencias o errores accionables si algun elemento queda fuera del lienzo, pierde legibilidad o no puede renderizarse completamente
- **AND** no modifica el modelo de negocio ni los datos originales del proyecto

### Requirement: Previsualizacion fiel antes de descargar
El sistema SHALL mostrar una previsualizacion previa a la descarga que represente de forma fiel el contenido que sera exportado al PDF, para que el usuario pueda detectar errores de disposicion antes de confirmar la generacion final.

#### Scenario: Revision visual previa a la descarga
- **WHEN** el usuario solicita actualizar la vista previa en la ventana "Exportar a PDF"
- **THEN** la interfaz muestra una representacion consistente con el layout y la escala del PDF final
- **AND** la vista previa refleja el plano, los dispositivos y el subsistema seleccionado con la misma logica de render usada para exportar
- **AND** la accion de previsualizar no altera la logica de negocio ni persiste cambios en el proyecto

### Requirement: Precision automatizada de coordenadas
El sistema SHALL contar con pruebas automatizadas que verifiquen que las coordenadas exportadas para cada dispositivo coinciden con las coordenadas originales del lienzo 2D con un margen de error maximo del 1%.

#### Scenario: Verificacion automatizada por tipo de dispositivo
- **WHEN** se ejecutan las pruebas del modulo de exportacion PDF
- **THEN** cada tipo de dispositivo soportado se valida contra sus coordenadas de origen
- **AND** cualquier desviacion superior al 1% hace fallar la validacion automatizada

## MODIFIED Requirements
### Requirement: Ventana "Exportar a PDF"
La ventana "Exportar a PDF" DEBERA centralizar la validacion previa, la previsualizacion fiel y la confirmacion de exportacion, utilizando el mismo pipeline de transformacion espacial del documento final para reducir discrepancias entre lo visto por el usuario y lo generado en el PDF.

## REMOVED Requirements
No aplica. No se elimina funcionalidad existente.
