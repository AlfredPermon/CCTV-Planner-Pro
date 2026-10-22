# Preservar dispositivos por vista (Cámaras ↔ Parquímetro ↔ Combinada) Spec

## Why
Al cambiar de “Cámaras” a “Parquímetro” y regresar a “Cámaras”, las cámaras previamente sembradas se pierden porque la vista Parquímetro limpia los arreglos de dispositivos. Se requiere preservar los dispositivos de cada sistema al navegar entre vistas y mostrar todos al elegir “Combinada”.

## What Changes
- No eliminar ni reiniciar los arreglos de dispositivos al cambiar de vista. La “limpieza” al entrar a Parquímetro debe ser visual (viewport/estado de interacción), no destructiva de datos.
- Renderización controlada por vista:
  - Cámaras: solo cámaras.
  - Parquímetro: solo parquímetros.
  - Control de Acceso: solo dispositivos de acceso.
  - Voceo: solo voceo.
  - Incendio: solo incendio.
  - Combinada: todos los sistemas a la vez.
- Validaciones de siembra en Parquímetro: considerar únicamente dispositivos de parquímetro (no bloquear por la existencia de cámaras/acceso/voceo/incendio). Mantener límites de lienzo y superposición dentro del conjunto de Parquímetro.
- Mensajes de estado: al entrar a Parquímetro, mantener mensajes de guía sin borrar datos; al volver a Cámaras, mostrar las cámaras existentes.

## Impact
- Capacidades afectadas: Cambios de vista en Diseño 2D, siembra Parquímetro, renderización y selección en lienzo, mensajes de estado.
- Código afectado:
  - [page.tsx](file:///c:/editor_cctv/src/app/page.tsx): manejadores de vista/estado, mensajes de estado, invocación de CCTVCanvas.
  - [CCTVCanvas.tsx](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx): flags de dibujo por vista, hit-tests, creación/selección de dispositivos; soporte para “combinada” mostrando todos.

## ADDED Requirements
### Requirement: Preservar dispositivos al cambiar de vista
El sistema DEBERÁ mantener intactos los dispositivos sembrados de cada sistema cuando el usuario cambie entre “Cámaras”, “Parquímetro”, “Control de Acceso”, “Voceo”, “Incendio” y “Combinada”.

#### Scenario: Cambiar Cámaras → Parquímetro → Cámaras
- WHEN el usuario tiene cámaras sembradas, cambia a “Parquímetro” y regresa a “Cámaras”
- THEN las cámaras originales siguen visibles e intactas.

### Requirement: Vista Combinada
El sistema DEBERÁ mostrar simultáneamente todos los sistemas en “Combinada”, sin ocultar ni borrar dispositivos.

#### Scenario: Activar Combinada
- WHEN el usuario selecciona “Combinada”
- THEN se visualizan cámaras, parquímetro, control de acceso, voceo e incendio.

## MODIFIED Requirements
### Requirement: Limpieza al entrar a Parquímetro
La “limpieza” del lienzo al activar Parquímetro se MODIFICA para que sea exclusivamente visual (reset del viewport/cursores/estados temporales) y NO elimine dispositivos de otros sistemas. La colocación en Parquímetro deberá validar solo contra dispositivos de parquímetro para superposición y límites.

## REMOVED Requirements
No aplica. No se eliminan capacidades existentes; se corrige el comportamiento de cambio de vista para no borrar datos.

