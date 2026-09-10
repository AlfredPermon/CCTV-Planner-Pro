# Diseño de Base de Datos (Prisma)

## Tablas
- cat_componentes: catálogo maestro con `codigo_componente` (PK), descripción, unidad, categoría y sistema.
- cotizaciones_historico: histórico de precios con `vigente` (bool) y `fecha_actualizacion`.
- proyectos_calculos: encabezado de proyecto con `total_calculado`.
- detalle_calculos: partidas por proyecto con cantidades, costos y sistema.

## Índices
- cat_componentes: `[sistema, categoria]`, `[codigo_componente, sistema]`.
- cotizaciones_historico: `[codigo_componente, proveedor, vigente]`, `[fecha_actualizacion]`.
- detalle_calculos: `[id_proyecto, sistema]`.

## Triggers / Historificación
- En SQLite se gestiona por aplicación: nuevas cotizaciones se insertan con `vigente=true` y se desactivan anteriores del mismo `codigo_componente` y `proveedor`.

## Integridad
- FK de `cotizaciones_historico` → `cat_componentes`.
- FK de `detalle_calculos` → `proyectos_calculos`.

