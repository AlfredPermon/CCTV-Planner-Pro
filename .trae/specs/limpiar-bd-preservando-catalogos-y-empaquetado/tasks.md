# Tasks
- [x] Task 1: Delimitar el alcance de limpieza y las reglas de preservación de catálogos.
  - [x] SubTask 1.1: Identificar tablas, colecciones o archivos persistentes involucrados en la limpieza.
  - [x] SubTask 1.2: Mapear los registros protegidos de CCTV, Control de Acceso, Parquímetro, Voceo y Detección contra incendios.
  - [x] SubTask 1.3: Definir criterios verificables de qué datos sí pueden limpiarse sin afectar la operación.
- [x] Task 2: Implementar el proceso de limpieza segura con validaciones pre y post ejecución.
  - [x] SubTask 2.1: Crear la rutina o script de limpieza con exclusiones explícitas para catálogos protegidos.
  - [x] SubTask 2.2: Registrar métricas de integridad antes y después de la limpieza.
  - [x] SubTask 2.3: Asegurar que los datos preservados siguen siendo consultables por las funcionalidades dependientes.
- [x] Task 3: Estructurar el proceso de distribución y empaquetado posterior a la limpieza.
  - [x] SubTask 3.1: Ajustar scripts o flujo de build para incluir todos los artefactos obligatorios.
  - [x] SubTask 3.2: Incorporar validación de integridad de archivos y compatibilidad básica del entorno objetivo.
  - [x] SubTask 3.3: Generar o actualizar documentación de instalación, verificación y recuperación.
- [x] Task 4: Ejecutar la validación funcional completa después de la instalación.
  - [x] SubTask 4.1: Verificar acceso y consulta correcta de los catálogos preservados.
  - [x] SubTask 4.2: Ejecutar pruebas de funcionalidades core afectadas por persistencia, cálculo, siembra y exportación.
  - [x] SubTask 4.3: Documentar resultados, incidencias y evidencia de corrección antes del cierre.
- [x] Task 5: Cerrar la entrega con comprobaciones finales.
  - [x] SubTask 5.1: Repetir las validaciones que hayan fallado tras aplicar correcciones.
  - [x] SubTask 5.2: Confirmar que el paquete distribuible instala correctamente en el entorno definido.
  - [x] SubTask 5.3: Consolidar evidencia final de limpieza segura, instalación exitosa y operación sin regresiones.

# Task Dependencies
- [Task 2] depende de [Task 1]
- [Task 3] depende de [Task 1] y puede avanzar en paralelo con [Task 2] una vez definidas las reglas de preservación
- [Task 4] depende de [Task 2] y [Task 3]
- [Task 5] depende de [Task 4]
