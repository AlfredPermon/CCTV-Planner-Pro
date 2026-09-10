# Estándar de Códigos y Catálogos para Calculadora de Costos

Para asegurar que la "Calculadora de Costos" funcione correctamente y evitar el error "Precios no disponibles", es **obligatorio** utilizar los siguientes códigos estandarizados en la columna `codigo` de la plantilla de carga masiva.

Cualquier variación (ej. "CABLE UTP" en lugar de "CCTV_CABLE") provocará que el sistema no encuentre el precio.

## Tabla Maestra de Códigos

### Sistema CCTV (Cámaras)
| Código Estandarizado | Descripción Sugerida | Uso en Cálculo |
|----------------------|----------------------|----------------|
| `CCTV_CABLE` | Cable UTP Cat6 / Fibra | Metros lineales por cámara |
| `CCTV_CONECTOR` | Conector RJ45 / Jack | Por punto de conexión |
| `CCTV_FUENTE` | Fuente de Poder CCTV | Según requerimiento de potencia |
| `CCTV_CANAL` | Tubería / Canalización | Metros lineales de ductería |

### Sistema ACCESO (Control de Acceso)
| Código Estandarizado | Descripción Sugerida | Uso en Cálculo |
|----------------------|----------------------|----------------|
| `ACC_CABLE` | Cable Multi-conductor | Metros lineales por punto |
| `ACC_CONTROLADORA` | Panel Controladora Acceso | Por puerta/punto |
| `ACC_CERRADURA` | Electroimán / Chapa | Por puerta |
| `ACC_FUENTE` | Fuente de Poder Acceso | Para chapas y lectores |

### Sistema VOCEO (Audio Evacuación)
| Código Estandarizado | Descripción Sugerida | Uso en Cálculo |
|----------------------|----------------------|----------------|
| `VOC_CABLE` | Cable de Audio Blindado | Metros lineales |
| `VOC_AMPLIFICADOR` | Amplificador de Zona | Por zona de audio |
| `VOC_FUENTE` | Respaldo de Energía | Baterías / UPS |
| `VOC_ALTAVOZ` | Bocina / Altavoz | Por punto de audio |

### Sistema INCENDIO (Detección Fuego)
| Código Estandarizado | Descripción Sugerida | Uso en Cálculo |
|----------------------|----------------------|----------------|
| `FIR_CABLE` | Cable FPL / FPLR | Metros lineales de lazo |
| `FIR_PANEL` | Panel FACP | Central de incendio |
| `FIR_MODULO` | Módulo Monitor/Control | Interfaz con equipos |
| `FIR_SIRENA` | Sirena Estroboscópica | Notificación audiovisual |

## Reglas de Carga

1. **Exactitud**: El código debe ser EXACTO (mayúsculas, guiones bajos).
   - *Incorrecto*: "cctv cable", "CCTV-CABLE", "Cable UTP"
   - *Correcto*: "CCTV_CABLE"

2. **Validación Automática**: El sistema ahora corrige automáticamente espacios y minúsculas, pero se recomienda usar la plantilla oficial.

3. **Sistema**: El sistema se asignará automáticamente según el prefijo del código (`CCTV_`, `ACC_`, etc.), ignorando lo que diga la columna "sistema" si hay conflicto.
