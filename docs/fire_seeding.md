# Siembra de Detección Contra Incendio

## Objetivo
- Permitir sembrar dispositivos de detección contra incendio en un plano limpio duplicado del plano base.
- Mantener sembrados de Cámaras, Acceso y Voceo intactos y separados.

## Vistas Disponibles
- Incendio: muestra solo dispositivos de detección contra incendio.
- Cámaras, Acceso, Voceo: muestran cada capa por separado.
- Combinada: muestra todas las capas juntas.

## Crear plano limpio de Incendio
- Use el botón “Detección Contra Incendio” en la barra superior.
- El sistema clona el plano base y limpia la capa de Incendio.
- Los demás sembrados permanecen sin cambios.

## Guardar y Abrir Semillas
- Menú “Sembrados” → Guardar/Abrir Incendio.
- Formato JSON: incluye `floorPlan` y `fireDevices`.

## Catálogo
- En el panel lateral y en la pestaña “Catálogo” aparece “Detección Contra Incendio”.
- Contiene dispositivos basados en la marca Hochiki (paneles L@titude, detectores, estaciones, módulos, notificación).

## Validaciones
- Se evita solapar posiciones con dispositivos de otras capas al agregar nuevos elementos.

## Atajos del Lienzo
- Copiar Ctrl+C, Pegar Ctrl+V, arrastre y rotación con Shift.
