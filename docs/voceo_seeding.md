 # Siembra Separada de Voceo
 
 Este módulo permite sembrar dispositivos de Voceo (bocinas, cornetas y paneles) de forma totalmente independiente de las cámaras y del control de acceso.
 
 ## Conceptos
 - Plano base: imagen cargada inicialmente.
 - Plano de Voceo: copia limpia del plano base usada para el sembrado de Voceo.
 - Sembrados separados: cada conjunto (cámaras, acceso, voceo) se guarda/abre de forma independiente.
 
 ## Flujo
 1. Presione el botón “Voceo” en la barra superior para crear un plano limpio (copia del base) y activar la vista Voceo.
 2. Agregue dispositivos desde el “Catálogo de Voceo”.
 3. Use la selección de vistas (Cámaras / Acceso / Voceo / Combinada) para alternar rápidamente.
 
 ## Guardar/Abrir Semillas
 - Guardar Voceo: menú “Sembrados” → “Guardar Voceo” → descarga `voceo.seed.json` con `floorPlan`, `voceoDevices` e `iconScales`.
 - Abrir Voceo: menú “Sembrados” → “Abrir Voceo” → carga del archivo y activa la vista Voceo.
 
 ## Integridad y Separación
 - Las cámaras y dispositivos de acceso existentes no se modifican al sembrar Voceo.
 - Las vistas filtran el dibujo y la interacción por tipo.
 - Validaciones sencillas evitan superposiciones al agregar dispositivos entre conjuntos.
 
 ## Escalabilidad
 - La arquitectura de vistas y “semillas” permite añadir nuevos tipos de dispositivos en el futuro sin afectar los actuales.
 
 ## Consejos
 - Defina la escala del plano antes de medir distancias.
 - Use Ctrl+C / Ctrl+V o clic derecho para copiar/pegar dispositivos en el lienzo.
