# Siembra de dispositivos e íconos personalizados para Catálogo de Control de Acceso Spec

## Why
El Catálogo de Control de Acceso actualmente permite administrar modelos (CRUD) pero no ofrece la funcionalidad de “sembrar” dispositivos en el plano como sí ocurre en el Catálogo de Cámaras. Además, los íconos de control de acceso son genéricos y no representan visualmente los distintos componentes del sistema.

## What Changes
- Añadir al Catálogo de Control de Acceso una acción **+ Agregar** por ficha de modelo para sembrar dispositivos en el plano (con y sin leyenda), replicando el flujo probado del Catálogo de Cámaras.
- Vincular cada dispositivo sembrado con su modelo de catálogo (`modelId`, `modelName`) para trazabilidad y consistencia.
- Implementar un sistema extensible de íconos personalizados de Control de Acceso (vectoriales en canvas) con estados visuales: normal, hover, seleccionado, deshabilitado.
- Incorporar controles de propiedades para los dispositivos de Control de Acceso: rotación, mostrar/ocultar nombre, tamaño de fuente, familia de fuente y ajustes relacionados con la etiqueta.
- Añadir validaciones (fallback de icono, cobertura de registry) y pruebas unitarias (Vitest) para garantizar que la siembra y el mapeo de íconos funcionen correctamente sin romper compilación.

## Impact
- Affected specs: siembra desde catálogo, render en canvas, panel Propiedades, persistencia de dispositivos por vista/seed.
- Affected code:
  - UI: `src/components/access/AccessControlCatalog.tsx`
  - Orquestación/estado: `src/app/page.tsx`
  - Render e interacción en canvas: `src/components/cctv/CCTVCanvas.tsx`
  - Nuevos módulos: registry/heurísticas de tipos e íconos (por definir bajo `src/lib/access/` o `src/components/access/`).
  - Tests: archivos Vitest (por definir bajo `src/lib/access/**` o `src/components/access/**`).

## Análisis del estado actual (Catálogo de Cámaras)
- Arquitectura (UI → handler → estado → canvas → Propiedades):
  - La ficha de modelo en `CameraCatalog.tsx` expone **+ Agregar** que llama a `onAddCamera(type, modelId, modelName)` y resuelve el tipo por match/heurística.
  - `page.tsx` implementa `handleAddCamera(...)`, crea el objeto `Camera`, lo agrega al estado (`cameras`), selecciona el elemento y abre el panel **Propiedades**.
  - `CCTVCanvas.tsx` dibuja el icono según tipo, maneja hover/selección, y soporta interacciones: rotación (Shift+drag) y escala del icono (wheel) vía `iconScales`.
  - `PropertiesPanel` en `page.tsx` permite editar campos (p.ej. nombre y rotación) según el dispositivo seleccionado.

## ADDED Requirements
### Requirement: Siembra desde Catálogo de Control de Acceso
El sistema SHALL permitir sembrar un dispositivo de control de acceso desde cada ficha del catálogo mediante un botón **+ Agregar**.

#### Scenario: Siembra con leyenda
- **WHEN** el usuario presiona **+ Agregar** en una ficha de modelo de control de acceso
- **THEN** se crea un dispositivo en el plano con nombre inicial y el panel **Propiedades** se abre con ese dispositivo seleccionado
- **AND** el dispositivo guarda `modelId` y `modelName` del modelo seleccionado

#### Scenario: Siembra sin leyenda
- **WHEN** el usuario selecciona “Agregar sin leyenda” (misma ficha)
- **THEN** se crea un dispositivo con `name` vacío (o no visible) y con `modelId/modelName` persistidos

### Requirement: Tipificación adaptable por modelo
El sistema SHALL determinar el tipo/categoría de dispositivo a sembrar a partir del modelo (heurística y/o selector explícito), de forma extensible para soportar múltiples componentes del sistema.

#### Scenario: Resolución automática
- **WHEN** el usuario siembra un modelo (ej. “SpeedFace V5L”)
- **THEN** el sistema asigna una categoría e ícono coherentes (ej. terminal de reconocimiento facial)

### Requirement: Íconos personalizados por componente
El sistema SHALL proveer un conjunto de íconos personalizados para componentes de control de acceso, con consistencia visual con el catálogo y estados normal/hover/seleccionado/deshabilitado.

#### Scenario: Render de ícono por estado
- **WHEN** el usuario pasa el cursor por encima del dispositivo
- **THEN** el ícono refleja estado hover sin cambiar la lógica de selección
- **WHEN** el dispositivo está seleccionado
- **THEN** el ícono refleja estado seleccionado

### Requirement: Interacciones sobre íconos y etiqueta
El sistema SHALL soportar interacciones y propiedades para cada dispositivo de control de acceso:
- reducción/aumento de tamaño del ícono (scale),
- rotación,
- mostrar/ocultar nombre,
- reducción del tamaño de fuente y edición de fuente (familia),
- otras propiedades necesarias para mantener consistencia visual.

#### Scenario: Ajuste de escala
- **WHEN** el usuario usa la rueda del mouse sobre un dispositivo seleccionado
- **THEN** el tamaño del ícono cambia y se persiste por `id` en `iconScales` sin afectar el zoom del plano

#### Scenario: Ajuste de fuente
- **WHEN** el usuario modifica el tamaño/familia de la etiqueta en Propiedades
- **THEN** el nombre se renderiza con esa configuración y se mantiene tras recargar

### Requirement: Robustez y validaciones
El sistema SHALL incluir validaciones para asegurar que los íconos se rendericen de forma consistente y con fallback seguro:
- íconos desconocidos usan un ícono genérico,
- el registry de íconos cubre todas las categorías soportadas,
- no se introducen errores de compilación.

## MODIFIED Requirements
### Requirement: Propiedades para dispositivos de Control de Acceso
El panel **Propiedades** SHALL incluir controles adicionales para `accessDevices` (visibilidad de etiqueta, tamaño y familia de fuente), manteniendo el comportamiento existente para cámaras/parquímetro/otros.

### Requirement: Persistencia compatible
La carga/guardado (localStorage y archivos seed de acceso) SHALL ser retrocompatible: dispositivos previamente persistidos sin los nuevos campos deben seguir cargando y renderizando correctamente.

## REMOVED Requirements
N/A

