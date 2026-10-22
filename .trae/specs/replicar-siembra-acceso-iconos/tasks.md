# Tasks
- [x] Task 1: Levantar el flujo actual de siembra de Cámaras y definir contrato reusable para Acceso
  - [x] SubTask 1.1: Identificar puntos de integración (catálogo → handler → estado → canvas → Propiedades)
  - [x] SubTask 1.2: Definir estructura mínima del “device seed” para Acceso (incluye modelId/modelName/iconKey y propiedades de etiqueta)

- [x] Task 2: Implementar “+ Agregar” en el Catálogo de Control de Acceso
  - [x] SubTask 2.1: Añadir botón “Agregar” por ficha (sembrar con leyenda)
  - [x] SubTask 2.2: Añadir acción “Agregar sin leyenda” (misma ficha, sin romper UI existente)
  - [x] SubTask 2.3: Resolver categoría/tipo por heurística del modelo y/o selector explícito

- [x] Task 3: Habilitar siembra real de dispositivos de Acceso en la página (estado + persistencia retrocompatible)
  - [x] SubTask 3.1: Extender `AccessDevice` con campos opcionales (modelId/modelName/iconKey y configuración de etiqueta)
  - [x] SubTask 3.2: Ajustar `handleAddAccessDevice*` para recibir modelId/modelName y setear defaults coherentes
  - [x] SubTask 3.3: Asegurar compatibilidad de carga/guardado (localStorage + access seed)

- [x] Task 4: Diseñar e implementar el sistema de íconos personalizados de Control de Acceso
  - [x] SubTask 4.1: Crear un registry de íconos (por categoría/ícono) con paleta consistente y estados visuales
  - [x] SubTask 4.2: Incluir íconos representativos por componente (incluye ejemplo “SpeedFace V5L” como terminal facial)
  - [x] SubTask 4.3: Integrar el render en `CCTVCanvas` para accessDevices sin afectar cámaras/otros dispositivos
  - [x] SubTask 4.4: Añadir fallback seguro para íconos desconocidos

- [x] Task 5: Extender Propiedades para Control de Acceso (interacciones de etiqueta y fuente)
  - [x] SubTask 5.1: Añadir toggle mostrar/ocultar nombre y defaults coherentes con “sin leyenda”
  - [x] SubTask 5.2: Añadir control de tamaño de fuente y selector de familia de fuente
  - [x] SubTask 5.3: Mantener edición de nombre/rotación existente y no afectar Parking/CCTV

- [x] Task 6: Validaciones y pruebas unitarias (Vitest, entorno Node)
  - [x] SubTask 6.1: Pruebas de fábrica de siembra de AccessDevice (defaults, model binding, sin leyenda)
  - [x] SubTask 6.2: Pruebas de registry/mapeo de íconos (cobertura por categoría y fallback)
  - [x] SubTask 6.3: Verificar que no hay errores de compilación y que `npm test` pasa

- [ ] Task 7: Verificación manual de render consistente
  - [ ] SubTask 7.1: Revisión en Chrome/Edge/Firefox (si disponible) del render y estados hover/selección
  - [ ] SubTask 7.2: Validar en distintas resoluciones/zoom del navegador que el ícono y la etiqueta se ven correctos

# Task Dependencies
- [Task 2] depende de [Task 1]
- [Task 3] depende de [Task 1] y [Task 2]
- [Task 4] depende de [Task 3]
- [Task 5] depende de [Task 3] y [Task 4]
- [Task 6] depende de [Task 2], [Task 3] y [Task 4]
- [Task 7] depende de [Task 4] y [Task 5]
