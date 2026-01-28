# Arquitectura de Integración de Control de Acceso

## Topología
- Terminales de autenticación facial (ZKTECO SpeedFaceV5LP, G4L, SenseFace 7A) conectados a LAN TCP/IP (PoE opcional).
- Salidas Wiegand/RS-485 desde terminales hacia la controladora de puertas.
- Controladora acciona el relé que alimenta la chapa magnética 600Lb con buzzer/LED.
- Botón de salida sin contacto (TLEB102) y botón de emergencia (STI) cableados con NO/NC en serie al circuito de control.

## Protocolos y Compatibilidad
- Terminales: TCP/IP, WiFi, Wiegand (26/34 bits), RS-485, Relé, SDK HTTP según modelo.
- Chapa 600Lb: requiere relé y fuente 12/24V DC; verificar corriente y modo fail-safe/fail-secure.
- Botones: salidas NO/NC; asegurar lógica acorde a normativas locales y escenarios de emergencia.

## Flujo de Trabajo de Instalación
- Configuración de IP estática y NTP; alta de usuarios/rostros, reglas de acceso.
- Cableado de comunicación (Wiegand/RS-485) y control de relé hacia la chapa.
- Integración de botones de salida y emergencia; pruebas de apertura/cierre y señalización buzzer/LED.

## Consideraciones de Red y Energía
- Estimación de ancho de banda por eventos/SDK ~0.5 Mbps por terminal (sin streaming continuo).
- Segmentación por VLAN para seguridad; PoE para terminales si aplica.
- Fuente regulada 12/24V DC adecuada para chapas y controladoras; protección y etiquetado de circuitos.

## Mantenimiento y Seguridad
- Políticas de actualización de firmware; auditoría de registros de acceso.
- Respaldo de configuración y monitoreo de salud del sistema.
- Cumplimiento normativo: rutas de evacuación, accesibilidad y señalización.
