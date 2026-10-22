# Tasks
- [x] Task 1: Eliminar reseteo destructivo de arreglos al cambiar a Parquímetro en page.tsx
  - [x] SubTask 1.1: Remover llamadas que vacían `cameras`, `accessDevices`, `voceoDevices`, `fireDevices` en el handler de vista Parquímetro
  - [x] SubTask 1.2: Mantener solo el reset visual (viewport/cursores) y mensajes de estado
- [x] Task 2: Rehabilitar “Combinada” en CCTVCanvas
  - [x] SubTask 2.1: Dibujo: `view === 'combinada'` debe habilitar dibujo de todos los sistemas
  - [x] SubTask 2.2: Hit-tests y selección: soportar todos en Combinada manteniendo prioridades ya definidas
- [x] Task 3: Ajustar validación de siembra en Parquímetro
  - [x] SubTask 3.1: Validar superposición solo contra `parkingDevices`
  - [x] SubTask 3.2: Mantener verificación de límites dentro del plano
  - [x] SubTask 3.3: Mantener nomenclatura y secuencia de nombres por modelo
- [x] Task 4: Mensajes de estado
  - [x] SubTask 4.1: Confirmar mensaje al entrar a Parquímetro sin borrar datos
  - [x] SubTask 4.2: Mensaje de selección de modelo y listo para sembrar
- [x] Task 5: Verificación manual y diagnósticos
  - [x] SubTask 5.1: Cámaras → Parquímetro → Cámaras: cámaras preservadas
  - [x] SubTask 5.2: Parquímetro → Cámaras → Combinada: todos visibles
  - [x] SubTask 5.3: Sin errores de compilación, sin warnings críticos y sin regresiones

# Task Dependencies
- [Task 2] depende de [Task 1]
- [Task 3] depende de [Task 1]
- [Task 5] depende de [Task 1], [Task 2] y [Task 3]
