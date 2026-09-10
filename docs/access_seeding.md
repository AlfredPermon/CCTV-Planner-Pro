# Siembra separada de Control de Acceso

## Objetivo
- Permitir sembrar dispositivos de control de acceso en un plano limpio, independiente del sembrado de cámaras.
- Mantener integridad, rendimiento y almacenamiento separado de ambos conjuntos.

## Cómo usar
- Botón Control de Acceso en la barra superior: crea una copia del plano base como `floorPlanAccess` y cambia la vista a Acceso con sembrado limpio.
- Selector de Vista en el encabezado del Plano de Diseño:
  - Cámaras: muestra solo cámaras.
  - Acceso: muestra solo dispositivos de acceso sobre `floorPlanAccess` si existe; si no, usa el plano base.
  - Combinada: muestra ambos tipos.
- Menú Sembrados:
  - Guardar Cámaras: descarga `camaras.seed.json` con plano, cámaras e iconos.
  - Guardar Acceso: descarga `acceso.seed.json` con plano de acceso (o base) y dispositivos.
  - Abrir Cámaras/Acceso: carga cada sembrado de forma independiente y ajusta la vista.

## Notas Técnicas
- `floorPlanAccess` es una copia del plano base con id diferente para escalar/bloquear de manera independiente.
- Validación básica evita solapamientos inmediatos al sembrar acceso si coincide con una cámara.
- El lienzo soporta vistas con ocultamiento de capas para rendimiento.

## Pruebas
- Endpoint: `/api/access/seeding/tests` valida independencia de planos y preservación de cámaras.

## Recomendaciones
- Defina la escala en cada plano si requiere mediciones independientes.
- Use proyectos completos para persistencia integral y semillas cuando se necesite trabajar por capas.
