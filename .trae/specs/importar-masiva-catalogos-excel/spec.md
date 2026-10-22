# Importación Masiva de Catálogos (Excel)

## Why
Se requiere cargar en bloque modelos de dispositivos a los catálogos (Cámaras, Acceso, Voceo e Incendios) desde archivos Excel, con validación, preview, manejo de errores y actualización inmediata de la UI, sin romper la integración existente.

## What Changes
- Añadir un módulo común de importación desde Excel con drag-and-drop, barra de progreso y validación.
- Crear un diálogo modal reutilizable para importación por catálogo.
- Parsear Excel y validar columnas obligatorias: Marca, Modelo, Código, Descripción y Notas (opcional).
- Verificar duplicados por Código dentro del catálogo seleccionado.
- Mostrar preview de datos antes de confirmar la importación.
- Procesamiento por lotes con actualización de progreso.
- Manejo de errores robusto: continuar con registros válidos, generar archivo de log de filas problemáticas.
- Notificaciones de éxito/error y reporte resumen.
- Persistencia usando la capa actual (estado + localStorage) y actualización inmediata de la UI.
- Preparar interfaz para futura integración con API/BD y “transacciones” por lote si se habilita servidor.

## Impact
- Afecta código: componentes de catálogo y nueva UI de importación; utilidades para parsear Excel; almacenamiento en `src/lib/catalog`.
- No rompe la implementación actual de CRUD ni la persistencia local.
- Opcional: añadir dependencia `xlsx` para parseo en cliente; alternativa futura server-side.

## ADDED Requirements
### Requirement: Importación Masiva por Catálogo
El sistema SHALL permitir importar en bloque para:
- Cámaras, Control de Acceso, Voceo, Incendios

Incluye:
- Ventana modal con drag-and-drop y selector de archivo Excel.
- Validación de columnas: Marca, Modelo, Código, Descripción, Notas (opcional).
- Preview de datos y estado por fila (válida/error).
- Procesamiento por lotes con barra de progreso y toasts.
- Detección de duplicados por Código; los duplicados se reportan y no bloquean el resto.
- Generación de archivo de log con errores por fila para descarga.
- Al confirmar, los registros válidos se insertan y la UI refleja cambios sin recargar.

#### Scenario: Importación exitosa con algunos errores
- WHEN el usuario carga un Excel con algunas filas inválidas (p. ej., falta Código o duplicado)
- THEN el sistema muestra preview con errores, permite confirmar la importación de filas válidas, actualiza la UI y genera un log descargable con las filas problemáticas

## MODIFIED Requirements
### Requirement: Capa de almacenamiento y operaciones por lote
La capa de almacenamiento debe soportar inserciones por lote, con validación de duplicados y reporte de errores a nivel de fila, manteniendo la consistencia de la lista y la UI.

## REMOVED Requirements
No se eliminan requisitos anteriores; se amplían capacidades de administración con importación masiva.
