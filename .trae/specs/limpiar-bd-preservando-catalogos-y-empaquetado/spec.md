# Limpieza Segura de Base de Datos y Empaquetado Spec

## Why
La base de datos y el paquete de despliegue requieren una limpieza controlada para reducir residuos operativos sin comprometer la continuidad del sistema. El cambio debe garantizar que los catálogos críticos permanezcan intactos, que la instalación posterior sea reproducible y que la validación funcional detecte cualquier regresión antes del cierre.

## What Changes
- Definir un proceso de limpieza de base de datos con reglas explícitas de preservación para los catálogos de CCTV, Control de Acceso, Parquímetro, Voceo y Detección contra incendios.
- Incorporar validaciones previas y posteriores a la limpieza para verificar integridad, conteos y accesibilidad de los datos preservados.
- Estructurar un proceso de distribución y empaquetado que incluya artefactos necesarios, validación de integridad y compatibilidad con el entorno objetivo.
- Documentar el procedimiento de instalación y recuperación para evitar fallos durante el despliegue.
- Ejecutar y documentar pruebas funcionales completas después de la limpieza e instalación, resolviendo incidencias detectadas antes del cierre.

## Impact
- Affected specs: persistencia de catálogos, limpieza de datos operativos, distribución de artefactos, instalación, validación funcional end-to-end
- Affected code: `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/catalog/storage.ts`, `src/tests`, `src/lib/catalog/*.test.ts`, `.zscripts/build.sh`, `README.md`, `download/README.md`

## ADDED Requirements
### Requirement: Limpieza Segura de Datos
El sistema SHALL ejecutar una limpieza de la base de datos que preserve de forma permanente los componentes capturados pertenecientes a los catálogos de CCTV, Control de Acceso, Parquímetro, Voceo y Detección contra incendios.

#### Scenario: Preservación de catálogos protegidos
- **WHEN** se inicia el proceso de limpieza
- **THEN** el sistema identifica explícitamente los registros pertenecientes a los catálogos protegidos antes de aplicar cualquier eliminación, truncado, resiembra o depuración
- **AND** dichos registros no se eliminan, no se sobrescriben y permanecen consultables después de la limpieza

#### Scenario: Eliminación solo de datos permitidos
- **WHEN** la limpieza encuentra datos temporales, obsoletos, inconsistentes o regenerables fuera del conjunto protegido
- **THEN** el sistema elimina únicamente esos datos permitidos
- **AND** conserva intactas las relaciones, claves y estructura necesarias para la operación normal

#### Scenario: Validación posterior a la limpieza
- **WHEN** finaliza la limpieza
- **THEN** el sistema compara el estado previo y posterior de los catálogos protegidos
- **AND** confirma integridad de registros, posibilidad de consulta y ausencia de corrupción

### Requirement: Empaquetado e Instalación Verificables
El sistema SHALL generar un paquete de distribución estructurado que permita instalar la aplicación de forma consistente después de la limpieza de la base de datos.

#### Scenario: Construcción de artefacto instalable
- **WHEN** se ejecuta el proceso de empaquetado
- **THEN** el sistema incluye aplicación, archivos estáticos, base de datos necesaria, scripts operativos y cualquier dependencia requerida para arrancar el entorno objetivo
- **AND** rechaza la generación del paquete si faltan artefactos críticos

#### Scenario: Validación de integridad del paquete
- **WHEN** el artefacto de distribución queda generado
- **THEN** el sistema valida presencia, consistencia y legibilidad de todos los archivos obligatorios
- **AND** registra el resultado de la validación para auditoría del despliegue

#### Scenario: Documentación de instalación
- **WHEN** se entrega el paquete para despliegue
- **THEN** existe una guía de instalación con prerrequisitos, pasos de despliegue, validaciones posteriores y acciones de recuperación ante fallo

### Requirement: Verificación Funcional Integral
El sistema SHALL ejecutar una batería de pruebas funcionales después de la limpieza y la instalación para confirmar que no se introdujeron regresiones.

#### Scenario: Consulta de catálogos preservados
- **WHEN** se prueban los catálogos de CCTV, Control de Acceso, Parquímetro, Voceo y Detección contra incendios tras la instalación
- **THEN** sus registros preservados pueden listarse, consultarse y utilizarse desde las funcionalidades dependientes

#### Scenario: Validación de funcionalidades core
- **WHEN** se ejecuta la suite funcional posterior al despliegue
- **THEN** el sistema valida las capacidades core afectadas por persistencia, catálogos, cálculo, siembra y exportación según corresponda
- **AND** cualquier desviación queda documentada como incidencia

#### Scenario: Cierre con incidencias resueltas
- **WHEN** una prueba funcional falla
- **THEN** la incidencia se registra con evidencia reproducible
- **AND** el trabajo no se considera finalizado hasta aplicar la corrección y repetir exitosamente la validación afectada

## MODIFIED Requirements
### Requirement: Persistencia Operativa de Catálogos
La persistencia operativa existente SHALL tratar los catálogos de CCTV, Control de Acceso, Parquímetro, Voceo y Detección contra incendios como datos protegidos durante procesos de limpieza, empaquetado, migración e instalación.

## REMOVED Requirements
