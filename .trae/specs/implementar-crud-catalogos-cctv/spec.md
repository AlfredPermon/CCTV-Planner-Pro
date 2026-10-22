# CRUD de Catálogos en CCTV Planner Pro

## Why
Los catálogos actuales muestran datos mock y operaciones parciales. Se requiere una administración completa (CRUD) por catálogo para gestionar modelos de dispositivos, con validación, confirmación y notificaciones, reflejando cambios en la UI al instante.

## What Changes
- Añadir interfaces de administración por catálogo: Cámaras, Control de Acceso, Voceo y Incendio.
- Implementar formularios de alta y edición con validación de campos obligatorios.
- Implementar confirmación antes de eliminar registros.
- Integrar notificaciones de éxito/error tras cada operación (useToast + Toaster).
- Persistir y sincronizar datos de catálogos con estado de React y localStorage.
- Soportar múltiples modelos por catálogo con identificación única por “código de modelo”.
- Refactorizar componentes de catálogo para leer/escribir desde el almacenamiento y reflejar cambios sin recargar la página.
- **Sin cambios de servidor**: primera versión basada en almacenamiento local; integración con APIs podrá añadirse en una fase posterior si se solicita.

## Impact
- Afecta capacidades: administración y persistencia de catálogos; UX de formularios y listas.
- Afecta código: componentes de catálogo en `src/components/{cctv|access|voceo|fire}/`, página principal `src/app/page.tsx` (estado/persistencia), utilidades de notificación (`use-toast`, `toaster`), y `localStorage`.

## ADDED Requirements
### Requirement: CRUD por catálogo
El sistema SHALL proporcionar gestión completa de modelos para:
- Catálogo de Cámaras
- Catálogo de Control de Acceso
- Catálogo de Voceo
- Catálogo de Incendio

Incluye:
- Crear: formulario de alta con validación de campos obligatorios (p. ej., marca, modelo, código).
- Leer: listado tabular/cards con búsqueda/filtrado básico si aplica.
- Actualizar: formulario de edición con validación.
- Eliminar: diálogo de confirmación; si procede, notificación de éxito/error.
- Notificaciones: éxito y error usando `useToast` y `Toaster` ya montado.
- Integridad de datos: código de modelo único por catálogo; evitar registros vacíos; manejo básico de duplicados.
- Refresco inmediato: todas las operaciones deben reflejarse al instante en la UI sin recargar la página (estado local + escritura/lectura reactiva a localStorage).

#### Scenario: Éxito al crear
- WHEN el usuario completa los campos obligatorios y envía el formulario de alta
- THEN el registro se agrega al catálogo, se muestra en la lista de inmediato y aparece una notificación de éxito

#### Scenario: Confirmación al eliminar
- WHEN el usuario presiona eliminar en un registro
- THEN se muestra un diálogo de confirmación; al confirmar, el registro se elimina, la lista se actualiza y aparece una notificación de éxito

#### Scenario: Validación de duplicado
- WHEN el usuario intenta registrar un modelo con un código ya existente en el mismo catálogo
- THEN el sistema bloquea la operación y muestra una notificación de error indicando duplicado

## MODIFIED Requirements
### Requirement: Fuente de datos de catálogos
Los componentes de catálogo deben dejar de depender de arreglos mock internos y utilizar una capa de almacenamiento basada en estado React + localStorage (lectura/escritura reactiva), garantizando consistencia y actualización inmediata en la interfaz.

## REMOVED Requirements
No aplica. No se eliminan capacidades existentes; se reemplaza la fuente de datos mock por almacenamiento persistente local.
