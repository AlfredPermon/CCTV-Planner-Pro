# Plan: Catálogo de Sistema Parquímetro

## Resumen
- Objetivo: Implementar un nuevo “Catálogo de Sistema Parquímetro” siguiendo exactamente la arquitectura y patrones del catálogo existente, con almacenamiento en cliente (localStorage), validaciones, importación desde Excel y carga masiva de imágenes, además de integración en el menú “Catálogos”.
- Alcance aprobado: Sin backend/BD para CRUD (misma arquitectura que Cámaras), clave interna del tipo = `parking`, esquema de datos común `CatalogModel` (marca, modelo, codigo, descripcion, notas) y UI consistente con los demás catálogos.

## Estado Actual (inventario y patrones relevantes)
- UI de catálogos existentes:
  - Cámaras: [CameraCatalog.tsx](file:///c:/editor_cctv/src/components/cctv/CameraCatalog.tsx)
  - Control de Acceso: [AccessControlCatalog.tsx](file:///c:/editor_cctv/src/components/access/AccessControlCatalog.tsx)
  - Voceo: [VoceoCatalog.tsx](file:///c:/editor_cctv/src/components/voceo/VoceoCatalog.tsx)
  - Incendio: [FireDetectionCatalog.tsx](file:///c:/editor_cctv/src/components/fire/FireDetectionCatalog.tsx)
  - Sidebar catálogos: [catalog-sidebar.tsx](file:///c:/editor_cctv/src/components/ui/catalog-sidebar.tsx)
  - Integración principal: [page.tsx](file:///c:/editor_cctv/src/app/page.tsx)
- Lógica de Catálogo (compartida):
  - Tipos: [types.ts](file:///c:/editor_cctv/src/lib/catalog/types.ts) → `CatalogType`, `CatalogModel`
  - Hook: [useCatalog.ts](file:///c:/editor_cctv/src/lib/catalog/useCatalog.ts) → CRUD y sincronización con storage
  - Storage/validaciones: [storage.ts](file:///c:/editor_cctv/src/lib/catalog/storage.ts) → claves por tipo, unicidad `codigo`, requeridos
  - Importar Excel: [importExcel.ts](file:///c:/editor_cctv/src/lib/catalog/importExcel.ts)
  - Diálogos reusables: [ImportDialog.tsx](file:///c:/editor_cctv/src/components/catalog/ImportDialog.tsx), [BulkImageUploadDialog.tsx](file:///c:/editor_cctv/src/components/catalog/BulkImageUploadDialog.tsx)
- API soporte (imágenes):
  - POST /api/upload-images: [route.ts](file:///c:/editor_cctv/src/app/api/upload-images/route.ts) → guarda en [public/FOTOS_SISTEMAS](file:///c:/editor_cctv/public/FOTOS_SISTEMAS)
- Pruebas existentes (Vitest): [vitest.config.ts](file:///c:/editor_cctv/vitest.config.ts), ejemplos en [src/lib/costs/engine.test.ts](file:///c:/editor_cctv/src/lib/costs/engine.test.ts), [src/lib/pdf/export.test.ts](file:///c:/editor_cctv/src/lib/pdf/export.test.ts), [src/tests](file:///c:/editor_cctv/src/tests)

## Decisiones Aprobadas
- Persistencia/API: Igual que Cámaras → cliente (localStorage) + endpoint de imágenes existente.
- Clave interna del tipo: `parking`.
- Esquema de datos: Se mantiene `CatalogModel` tal cual (marca, modelo, codigo, descripcion, notas).
- UI: Se agrega sección “Catálogo de Sistema Parquímetro” en el panel de Catálogos con CRUD, importación desde Excel y carga masiva de imágenes. Sin “siembra” en plano 2D en esta fase.

## Cambios Propuestos
1) Tipos y Storage
- Archivo: [src/lib/catalog/types.ts](file:///c:/editor_cctv/src/lib/catalog/types.ts)
  - Agregar `'parking'` a `CatalogType`.
- Archivo: [src/lib/catalog/storage.ts](file:///c:/editor_cctv/src/lib/catalog/storage.ts)
  - Agregar clave de almacenamiento para `parking` en `CATALOG_STORAGE_KEYS` (`catalog:parking`).

2) Nuevo Catálogo UI
- Archivo nuevo: [src/components/parking/ParkingCatalog.tsx](file:///c:/editor_cctv/src/components/parking/ParkingCatalog.tsx)
  - Clonado/ajustado desde el patrón de `AccessControlCatalog.tsx`.
  - Usa `useCatalog('parking')` para CRUD local.
  - Incluye diálogos de Importación y Subida de Imágenes, validaciones y toasts, exactamente igual al patrón existente.

3) Integración en Menú y Página Principal
- Archivo: [src/components/ui/catalog-sidebar.tsx](file:///c:/editor_cctv/src/components/ui/catalog-sidebar.tsx)
  - Extender `CatalogKey` con `'parking'` y sumar un `AccordionItem` “Catálogo de Sistema Parquímetro” (icono seguro de lucide, p. ej. `Car`).
- Archivo: [src/app/page.tsx](file:///c:/editor_cctv/src/app/page.tsx)
  - Ampliar el tipo de `selectedCatalog` para incluir `'parking'`.
  - Cargar y renderizar `<ParkingCatalog />` cuando `selectedCatalog === 'parking'` (habilitar/inhabilitar según patrón actual, p. ej. `disabled={!floorPlan}` o siempre habilitado; se usará `disabled={!floorPlan}` para consistencia con Cámaras).

4) Pruebas
- Archivo nuevo: [src/lib/catalog/storage.parking.test.ts](file:///c:/editor_cctv/src/lib/catalog/storage.parking.test.ts)
  - Pruebas unitarias sobre `storage.ts` para el tipo `parking`: agregar, actualizar (valida requeridos y unicidad), eliminar y lectura en memoria (ambiente Node sin `localStorage`).

## Detalle de Implementación
1) Tipos/Storage
- `types.ts`:
  - `export type CatalogType = "cameras" | "access" | "voceo" | "fire" | "parking";`
- `storage.ts`:
  - Incluir en `CATALOG_STORAGE_KEYS` la entrada `parking: "catalog:parking"`.
  - No se tocan las funciones, ya son genéricas por `type`.

2) ParkingCatalog.tsx
- Basado en `AccessControlCatalog.tsx`:
  - Cambiar `useCatalog('access')` por `useCatalog('parking')`.
  - Textos de UI genéricos (“Nuevo modelo”, “Importar Excel”, “Subir imágenes”, etc.) ya consistentes.
  - Mantener flujo de validación (marca/modelo/codigo requeridos) y unicidad de `codigo` delegada a `storage.ts`.
  - Mantener `BulkImageUploadDialog` y `ImportDialog` con `type="parking"`.

3) Sidebar/Página
- `catalog-sidebar.tsx`:
  - Extender unión `CatalogKey` con `'parking'`.
  - Agregar acordeón con label “Catálogo de Sistema Parquímetro” y descripción acorde.
- `page.tsx`:
  - Extender el tipo de `selectedCatalog` para incluir `'parking'`.
  - Importar el nuevo `ParkingCatalog`.
  - Agregar rama de renderizado cuando `selectedCatalog === 'parking'` (análogo a access/voceo/fire).

4) Pruebas (Vitest)
- `storage.parking.test.ts` (ambiente Node) debe validar:
  - Lectura inicial vacía para `parking`.
  - `addModel('parking', ...)` agrega y respeta unicidad de `codigo` (esperar `throw` en duplicado).
  - `updateModel('parking', ...)` exige requeridos y conserva unicidad (excluyendo el propio id).
  - `deleteModel('parking', ...)` elimina sin afectar otros tipos.

## Verificación
- Build tipado: `next build` (sin ejecutar en esta fase; se ejecutará al implementar).
- Pruebas: `pnpm test` o `npm run test` con Vitest; deben pasar las nuevas pruebas y las existentes.
- Pruebas manuales UI:
  - Abrir app y verificar:
    - Aparición del “Catálogo de Sistema Parquímetro” en el panel “Catálogos”.
    - CRUD de modelos en Parquímetro (crear/editar/eliminar) con toasts y validaciones.
    - Importar Excel con mapeo y prevalidación (errores descargables).
    - Subir imágenes y visualización de miniaturas por nombre de archivo.
  - No deben romperse otros catálogos.

## Criterios de Aceptación
- Código compila sin errores y lint sin issues nuevas.
- Catálogo “Parquímetro” visible en el menú y funcional (CRUD, importación, subida de imágenes).
- Validaciones equivalentes a las de otros catálogos (campos requeridos, unicidad de `codigo`, mensajes en español).
- Sin regresiones en Cámaras/Acceso/Voceo/Incendio.
- Pruebas unitarias nuevas pasando en Vitest.

## Riesgos y Mitigaciones
- Icono en Sidebar: si el icono elegido no existe en `lucide-react`, usar `Car` (probado en librería) como fallback.
- Dependencias cruzadas: Actualizaciones de uniones de tipos en Sidebar y `page.tsx` pueden causar errores de tipado; mitigado con imports correctos y ampliación explícita de uniones.
- Diferencias de comportamiento: Mantener `disabled={!floorPlan}` para la UI de catálogo al abrir desde Diseño 2D, igual que Cámaras, garantiza consistencia.

## Secuencia de Ejecución
1) Editar `types.ts` y `storage.ts` para agregar `parking`.
2) Crear `ParkingCatalog.tsx` en `src/components/parking/`.
3) Integrar en `catalog-sidebar.tsx`.
4) Integrar en `page.tsx` con rama de renderizado.
5) Crear pruebas `storage.parking.test.ts` y ejecutar Vitest.
6) Pruebas manuales UI y ajuste menor si aplica.

