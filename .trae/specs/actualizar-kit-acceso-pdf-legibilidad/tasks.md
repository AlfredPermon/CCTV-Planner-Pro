# Tasks
- [x] Task 1: Auditar el flujo actual del kit PDF de Control de Acceso y del render de etiquetas
  - [x] SubTask 1.1: Identificar cómo se agrupan hoy los dispositivos del kit en `accessExportGrouping`
  - [x] SubTask 1.2: Confirmar dónde se pinta la lista "Dispositivos asociados" y el crop visual del kit en el PDF
  - [x] SubTask 1.3: Revisar los defaults y el render de etiquetas de `accessDevices` en el canvas

- [x] Task 2: Actualizar el bloque PDF "Kit Control de Acceso (Individuales)" a cinco accesos
  - [x] SubTask 2.1: Ajustar la agrupación o plantilla del kit para mostrar `Acceso 1, 2, 3, 4, 5` en el bloque requerido
  - [x] SubTask 2.2: Añadir `BZL600N - 5` a la lista de dispositivos asociados y al render visual del kit
  - [x] SubTask 2.3: Mantener estructura, estilos y paginación general del PDF sin rediseño innecesario

- [x] Task 3: Mejorar legibilidad y accesibilidad de etiquetas en Control de Acceso
  - [x] SubTask 3.1: Incrementar tamaño mínimo legible de fuente para etiquetas de `accessDevices`
  - [x] SubTask 3.2: Mejorar nitidez del render tipográfico y el fondo/contraste de la etiqueta
  - [x] SubTask 3.3: Verificar que offsets, alineación y responsividad no se rompan con el ajuste visual

- [x] Task 4: Ampliar pruebas automatizadas
  - [x] SubTask 4.1: Actualizar pruebas de agrupación del kit PDF para el caso de cinco accesos
  - [x] SubTask 4.2: Añadir prueba de render/configuración base de etiquetas de acceso con el nuevo estándar mínimo
  - [x] SubTask 4.3: Ejecutar pruebas relevantes de PDF y acceso para detectar regresiones

- [x] Task 5: Verificación funcional y visual
  - [x] SubTask 5.1: Confirmar que el PDF se descarga con los datos actualizados
  - [x] SubTask 5.2: Revisar la sección Control de Acceso en distintas resoluciones y, cuando sea viable, en múltiples navegadores
  - [x] SubTask 5.3: Confirmar que la legibilidad cumple sin romper layout ni alineación

# Task Dependencies
- Task 2 depende de Task 1
- Task 3 depende de Task 1
- Task 4 depende de Task 2 y Task 3
- Task 5 depende de Task 4
