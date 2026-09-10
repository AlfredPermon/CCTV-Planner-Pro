# Guía de Instalación, Actualización y Ejecución Portátil

Esta guía describe el empaquetado, instalación y administración de la aplicación en modo portátil ejecutable.

---

## Arquitectura del Paquete de Distribución

El empaquetado portable utiliza una **Estrategia Anti-Sobreescritura**:
- **`app/db/seed_custom.db`**: Plantilla inicial prístina del catálogo. Al extraer un ZIP de actualización en una instalación existente, **nunca se sobreescribe** la base de datos activa del usuario (`custom.db`).
- **`app/db/custom.db`**: Base de datos activa producida y utilizada por el usuario en tiempo de ejecución.
- **`app/public/FOTOS_SISTEMAS/`**: Carpeta de imágenes cargadas y del catálogo que se preservan durante las actualizaciones.

---

## Contenido del Paquete Distribuible

El paquete generado incluye:

- **`install.bat` / `install.sh`**: Scripts de instalación y actualización interactiva.
- **`start.bat` / `start.sh`**: Scripts de arranque autocurativos con cálculo dinámico de `DATABASE_URL`.
- **`app/`**: Aplicación Next.js compilada en modo standalone (`server.js`, `.next/static`, `public`, `db/seed_custom.db`).
- **`artifact-manifest.json` y `checksums.sha256`**: Inventario e indicadores de integridad del paquete.
- **`tools/`**: Herramientas de validación (`validate-package.mjs`), respaldo (`backup-db.mjs`) y restauración (`restore-db.mjs`).

---

## Empaquetado Automático (.zip)

Para empaquetar la aplicación desde la raíz del proyecto en Windows:

```powershell
npm run make-dist
```
o ejecutando directamente:
```powershell
.\make-dist.ps1
```

Este script automatiza:
1. Verificación de espacio disponible en disco (mínimo 500 MB libres).
2. Compilación standalone de Next.js (`npm run build`).
3. Empaquetado de la estructura ejecutable y datos semilla (`db/seed_custom.db`).
4. Verificación estricta de integridad de manifiesto y checksums SHA-256.
5. Compresión final en un archivo ejecutable `.zip` dentro de la carpeta `dist/`.

---

## Instalación y Actualización

### En Windows (`install.bat`):
1. Extrae el paquete ZIP.
2. Ejecuta `install.bat`.
   - **Si es una nueva instalación**: Inicializa automáticamente `app\db\custom.db` desde `seed_custom.db`.
   - **Si ya existe `app\db\custom.db`**: Se presenta un menú interactivo:
     - **Opción 1 (Actualizar y Preservar - Recomendada)**: Crea un respaldo fechado `custom.db.bak_YYYYMMDD_HHMMSS` y mantiene intactos todos tus datos registrados e imágenes.
     - **Opción 2 (Instalación Limpia)**: Genera un respaldo preventivo y restaura el catálogo por defecto desde `seed_custom.db`.

### En Linux / macOS (`install.sh`):
```bash
chmod +x install.sh start.sh
./install.sh
```

---

## Arranque Autocurativo

Para iniciar la aplicación:

- **Windows**:
  ```cmd
  .\start.bat
  ```
- **Linux / macOS**:
  ```bash
  ./start.sh
  ```

**Lógica Autocurativa**:
Si al iniciar falta la base de datos `custom.db`, el script de inicio la restaurará automáticamente a partir de `seed_custom.db` antes de levantar el servidor web en `http://localhost:3000`.

---

## Respaldos y Recuperación Manual

Para generar un respaldo en cualquier momento:
```bash
node tools/backup-db.mjs
```
Los respaldos se almacenarán en el directorio `backups/`.

Para restaurar manualmente un respaldo previo:
```bash
node tools/restore-db.mjs --source .\backups\custom.db.bak_YYYYMMDD_HHMMSS
```
