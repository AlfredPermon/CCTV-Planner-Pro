# Plan: Botón "Agregar sin leyenda" y edición por doble clic en ícono

## Objetivo
- Incorporar en los Catálogos de Control de Acceso, Voceo e Incendio un nuevo botón "Agregar sin leyenda" junto al actual "Agregar".
- Al agregar sin leyenda, el dispositivo se coloca en el plano sin texto. Luego, al hacer doble clic sobre el ícono del dispositivo en el plano, se abre una ventana modal para capturar texto y actualizar dinámicamente su leyenda.

## Alcance
- Interfaces afectadas: Catálogo de Control de Acceso, Catálogo de Voceo, Catálogo de Incendio.
- Comportamiento en el lienzo (CCTVCanvas) para soportar doble clic en íconos de dispositivos con nombre vacío.
- Mantener intacta la opción "Agregar" original.

## Arquitectura actual (referencias)
- Catálogo Control de Acceso: [AccessControlCatalog.tsx](file:///c:/editor_cctv/src/components/access/AccessControlCatalog.tsx#L1-L174)
- Catálogo Voceo: [VoceoCatalog.tsx](file:///c:/editor_cctv/src/components/voceo/VoceoCatalog.tsx#L1-L251)
- Catálogo Incendio: [FireDetectionCatalog.tsx](file:///c:/editor_cctv/src/components/fire/FireDetectionCatalog.tsx#L1-L219)
- Montaje en la página: [page.tsx](file:///c:/editor_cctv/src/app/page.tsx#L1128-L1159) y pestañas de catálogo [page.tsx](file:///c:/editor_cctv/src/app/page.tsx#L1212-L1231)
- Handlers de alta: [handleAddAccessDevice](file:///c:/editor_cctv/src/app/page.tsx#L523-L551), [handleAddVoceoDevice](file:///c:/editor_cctv/src/app/page.tsx#L562-L590), [handleAddFireDevice](file:///c:/editor_cctv/src/app/page.tsx#L599-L633)
- Render de leyendas: [CCTVCanvas.tsx](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L411-L418), [CCTVCanvas.tsx](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L462-L468), [CCTVCanvas.tsx](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L518-L524), [CCTVCanvas.tsx](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L591-L597)
- Doble clic actual solo en área de etiqueta: [onDoubleClick](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L1214-L1276). Hit-tests: [hitTestDevice](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L636-L647), [hitTestVoceo](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L648-L659), [hitTestFire](file:///c:/editor_cctv/src/components/cctv/CCTVCanvas.tsx#L660-L671).
- Primitivas de Dialog: [dialog.tsx](file:///c:/editor_cctv/src/components/ui/dialog.tsx).

## Cambios planificados
- Catálogos (UI):
  - Añadir segundo botón "Agregar sin leyenda" en cada tarjeta de dispositivo.
  - Extender props de cada catálogo para recibir onAddDeviceWithoutLegend(type, modelId).
  - Mantener "Agregar" actual invocando los handlers existentes.
- Página principal (handlers):
  - Implementar handleAddAccessDeviceWithoutLegend, handleAddVoceoDeviceWithoutLegend, handleAddFireDeviceWithoutLegend.
  - Crear el dispositivo igual que hoy pero con name: '' y misma selección/propiedades visibles.
  - Pasar las nuevas funciones a los catálogos en ambos lugares donde se renderizan.
- Lienzo (CCTVCanvas):
  - Ampliar onDoubleClick para detectar doble clic sobre el ícono (hitTestDevice/Voceo/Fire).
  - Si el dispositivo tiene nombre vacío (name === ''), abrir Dialog modal de captura de texto.
  - Modal: Input de texto, botones "Aceptar" y "Cancelar". En "Aceptar", aplicar onAccessDeviceUpdate/onVoceoDeviceUpdate/onFireDeviceUpdate con el nuevo nombre y cerrar modal. En "Cancelar", cerrar sin cambios.
  - Mantener el comportamiento actual de edición por doble clic sobre la etiqueta cuando existe texto.
- Exportación PDF:
  - Sin cambios funcionales: el draw de leyendas usa el nombre; con name vacío, no dibuja texto junto al ícono y la lógica de listas seguirá mostrando nombres según estén definidos.

## Detalles de implementación
- AccessControlCatalog.tsx:
  - Props: agregar onAddDeviceWithoutLegend?: (type, modelId) => void.
  - En AccessDeviceCard, colocar dos botones:
    - "Agregar": onAddDevice(d.type, d.id).
    - "Agregar sin leyenda": onAddDeviceWithoutLegend?.(d.type, d.id).
  - Respetar prop disabled en ambos botones.
- VoceoCatalog.tsx y FireDetectionCatalog.tsx:
  - Mismo patrón de props y botones que en Acceso.
- page.tsx:
  - Implementar:
    - handleAddAccessDeviceWithoutLegend(type, modelId?): crea dispositivo con name: '' y mismos offsets/posiciones; setSelectedAccessDevice y mostrar panel de propiedades.
    - handleAddVoceoDeviceWithoutLegend(type, modelId?): igual pero para voceo.
    - handleAddFireDeviceWithoutLegend(type, modelId?): igual para incendio.
  - Pasar onAddDeviceWithoutLegend a los catálogos en ambos renderizados: acordeón/cierre y pestañas.
- CCTVCanvas.tsx:
  - Estado local: editingMissingLabel?: { id: string; kind: 'device' | 'voceo' | 'fire'; value: string } y flag open.
  - onDoubleClick:
    - Calcular x,y de mundo; si hitTestDevice(x,y) devuelve id y el dispositivo tiene name === '' => abrir Dialog para 'device'.
    - Igual para voceo y fire.
    - Mantener las rutas actuales para doble clic en etiquetas (label).
  - UI:
    - Renderizar <Dialog open={...}> con <DialogContent> que incluya:
      - Input controlado para texto.
      - Botones "Cancelar" y "Aceptar". "Aceptar" llama al updater correspondiente y cierra.
    - Usar componentes de ui/dialog y ui/input ya presentes en el proyecto.

## Archivos a modificar
- src/components/access/AccessControlCatalog.tsx
- src/components/voceo/VoceoCatalog.tsx
- src/components/fire/FireDetectionCatalog.tsx
- src/app/page.tsx
- src/components/cctv/CCTVCanvas.tsx

## Consideraciones de estilo y seguridad
- Seguir patrones existentes de props y handlers en page.tsx.
- No exponer claves/secretos; cambios son solo UI/estado local.
- Mantener nomenclatura en español y consistencia con componentes UI actuales.

## Validación
- Flujo 1 (Acceso): Abrir catálogo, usar "Agregar sin leyenda" en un terminal. Ver ícono sin texto. Doble clic en el ícono abre modal. Ingresar texto y "Aceptar": aparece la leyenda y se actualiza en el lienzo.
- Flujo 2 (Voceo/Incendio): Repetir con dispositivos de cada catálogo.
- Flujo 3: Doble clic en una etiqueta existente sigue mostrando el input flotante actual (sin cambios).
- Copiar/pegar: El nombre asignado se replica en copias como hoy (añade “(Copia)”).
- Exportación PDF: Generar y revisar que no surjan errores; texto depende de name.

## Criterios de aceptación
- Los tres catálogos muestran "Agregar" y "Agregar sin leyenda".
- "Agregar" mantiene comportamiento actual con leyenda predeterminada.
- "Agregar sin leyenda" coloca el dispositivo sin texto y permite capturar leyenda al doble clic sobre el ícono mediante modal con Aceptar/Cancelar.
- La leyenda se actualiza dinámicamente en el plano al confirmar.
