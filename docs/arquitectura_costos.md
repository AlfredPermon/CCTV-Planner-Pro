# Arquitectura del Sistema de Cálculos Paramétricos (Bajo Voltaje)

## Stack
- Next.js (App Router) + TypeScript
- Prisma ORM + SQLite
- Zod para validación
- Vitest para pruebas

## Módulos
- Ingesta de cotizaciones: tablas `cat_componentes` y `cotizaciones_historico`. El costo vigente se obtiene por `codigo_componente` con `vigente = true` y fecha más reciente.
- Motor de cálculos: funciones por subsistema en `src/lib/costs/engine.ts` con redondeo a 2 decimales y rendimiento validado.
- API de cálculo: `POST /api/costs/calculate` valida entrada, calcula, persiste proyecto y detalle y retorna totales.
- Reportes: se reutiliza el módulo de PDF existente en `src/lib/pdf/export.ts` (pendiente de integrar vistas).

## Flujo
1. Registrar/actualizar cotizaciones (masivo o unitario).
2. Ejecutar cálculo enviando conteos y parámetros técnicos.
3. Persistir proyecto y detalle; generar reportes desde la UI.

## Calidad
- Precisión de costos: 2 decimales sin acumulación.
- Rendimiento: pruebas con 500 dispositivos < 3s.
- Seguridad: sin almacenamiento de datos sensibles; integridad referencial en BD.

