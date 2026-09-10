# Calculadora Paramétrica de Costos

## Arquitectura de Datos
- Fuente: módulo Administración con cat_componentes y cotizaciones_historico.
- Cálculo: proyectos_calculos y detalle_calculos guardan resultados.
- Auditoría: audit_log registra acciones, usuario, estado y payload.

## Flujo
- UI captura parámetros por subsistema y del proyecto.
- API valida con Zod, opcionalmente optimiza parámetros vía Ollama.
- Motor calcula ítems y subtotales por sistema, aplica totales financieros.
- Persistencia y auditoría de resultados; exportación a Excel/PDF.

## Fórmulas
- Subtotales: suma de costo_total por ítems.
- Mano de obra: 20% de materiales.
- Inflación: materiales * (inflacionPct/100).
- Base: materiales + manoObra + inflación.
- Impuestos: base * (impuestosPct/100).
- Utilidad: base * (utilidadPct/100).
- Total final: base + impuestos + utilidad.

## Validación y Errores
- Validación de tipos y rangos en API y UI.
- Mapa de validaciones {codigo: {valido, mensaje}} para alertas.
- Diálogos de confirmación en acciones críticas.
- Respuestas descriptivas en errores.

## IA (Ollama)
- Indicador “Usar IA” en UI.
- Ajuste opcional de parámetros mediante chat model configurado localmente.

## Pruebas y Métricas
- Vitest: precisión numérica y rendimiento.
- Tolerancia máxima de error financiero: 0.01% relativa.
  - Asegurada con redondeo a 2 decimales en operaciones clave.

## Uso
- Configurar cotizaciones en Administración.
- Ir a Calculadora de Costos, ingresar parámetros y confirmar cálculo.
- Exportar Excel/PDF; revisar advertencias técnicas y auditorías.
