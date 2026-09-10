import { promises as fsp } from "node:fs";
import path from "node:path";

import {
  ARTIFACTS_TO_COPY,
  DIST_DIR,
  PACKAGE_DIR,
  ROOT_DIR,
  ensureCleanDirectory,
  movePath,
  pathExists,
  runCommand,
  validatePackage,
  writeManifest,
  copyPath,
} from "./shared.mjs";

async function copyArtifacts() {
  const copied = [];

  for (const artifact of ARTIFACTS_TO_COPY) {
    const exists = await pathExists(artifact.source);

    if (!exists) {
      if (artifact.required) {
        throw new Error(`Falta artefacto obligatorio previo al empaquetado: ${artifact.label}`);
      }
      continue;
    }

    if (artifact.strategy === "move") {
      await movePath(artifact.source, artifact.destination);
    } else {
      await copyPath(artifact.source, artifact.destination, {
        filter: artifact.filter,
      });
    }
    copied.push(path.relative(PACKAGE_DIR, artifact.destination) || ".");
  }

  return copied;
}

async function writeRuntimeScripts() {
  const installBat = `@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js no encontrado. Instala Node.js 20+ y vuelve a ejecutar install.bat
  exit /b 1
)

if not exist ".\\tools\\validate-package.mjs" (
  echo Falta tools\\validate-package.mjs. El paquete esta incompleto.
  exit /b 1
)

if not exist ".\\app\\db\\seed_custom.db" (
  echo Falta app\\db\\seed_custom.db. El paquete esta incompleto.
  exit /b 1
)

node ".\\tools\\validate-package.mjs"
if errorlevel 1 (
  echo La validacion de integridad fallo. No continuar.
  exit /b 1
)

if not exist ".\\backups" mkdir ".\\backups"
if not exist ".\\app\\db" mkdir ".\\app\\db"
if not exist ".\\app\\public\\FOTOS_SISTEMAS" mkdir ".\\app\\public\\FOTOS_SISTEMAS"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
if not defined datetime (
  set "TIME_CLEAN=%time: =0%"
  set datetime=%date:~6,4%%date:~3,2%%date:~0,2%_!TIME_CLEAN:~0,2!!TIME_CLEAN:~3,2!!TIME_CLEAN:~6,2!
)
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set "TIMESTAMP=%TIMESTAMP: =0%"

if exist ".\\app\\db\\custom.db" (
  echo.
  echo Base de datos existente detectada: app\\db\\custom.db
  echo.
  echo [1] Actualizar y Preservar ^(Recomendado^): Mantiene tus datos activos y genera copia de seguridad.
  echo [2] Instalacion Limpia: Restaura la base de datos predeterminada y genera copia de seguridad preventiva.
  echo.
  set CHOICE=1
  set /p CHOICE="Selecciona una opcion (1 o 2) [Default=1]: "
  if "!CHOICE!"=="2" (
    echo Generando copia de seguridad preventiva...
    copy /y ".\\app\\db\\custom.db" ".\\app\\db\\custom.db.bak_!TIMESTAMP!" >nul
    copy /y ".\\app\\db\\custom.db" ".\\backups\\custom.db.bak_!TIMESTAMP!" >nul
    echo Restaurando base de datos predeterminada desde seed_custom.db...
    copy /y ".\\app\\db\\seed_custom.db" ".\\app\\db\\custom.db" >nul
  ) else (
    echo Generando copia de seguridad de respaldo...
    copy /y ".\\app\\db\\custom.db" ".\\app\\db\\custom.db.bak_!TIMESTAMP!" >nul
    copy /y ".\\app\\db\\custom.db" ".\\backups\\custom.db.bak_!TIMESTAMP!" >nul
    echo Base de datos del usuario preservada e intacta.
  )
) else (
  echo Inicializando base de datos custom.db desde seed_custom.db...
  copy /y ".\\app\\db\\seed_custom.db" ".\\app\\db\\custom.db" >nul
)

echo.
echo Creando accesos directos en el Escritorio...
set VBS_SCRIPT="%temp%\\create_cctv_shortcuts.vbs"
echo Set WshShell = CreateObject("WScript.Shell") > !VBS_SCRIPT!
echo DesktopPath = WshShell.SpecialFolders("Desktop") >> !VBS_SCRIPT!
echo Set shortcut = WshShell.CreateShortcut(DesktopPath ^& "\\Iniciar Editor CCTV.lnk") >> !VBS_SCRIPT!
echo shortcut.TargetPath = "%~dp0Iniciar_Servidor.bat" >> !VBS_SCRIPT!
echo shortcut.WorkingDirectory = "%~dp0" >> !VBS_SCRIPT!
echo shortcut.Description = "Iniciar Servidor de Editor CCTV" >> !VBS_SCRIPT!
echo shortcut.IconLocation = "shell32.dll,13" >> !VBS_SCRIPT!
echo shortcut.Save >> !VBS_SCRIPT!
echo Set shortcutStop = WshShell.CreateShortcut(DesktopPath ^& "\\Detener Editor CCTV.lnk") >> !VBS_SCRIPT!
echo shortcutStop.TargetPath = "%~dp0Detener_Servidor.bat" >> !VBS_SCRIPT!
echo shortcutStop.WorkingDirectory = "%~dp0" >> !VBS_SCRIPT!
echo shortcutStop.Description = "Detener Servidor de Editor CCTV" >> !VBS_SCRIPT!
echo shortcutStop.IconLocation = "shell32.dll,27" >> !VBS_SCRIPT!
echo shortcutStop.Save >> !VBS_SCRIPT!
cscript //nologo !VBS_SCRIPT! >nul 2>&1
if exist !VBS_SCRIPT! del !VBS_SCRIPT! >nul 2>&1

echo.
echo ==========================================================
echo  ¡Instalacion completada con exito!
echo  Credenciales de acceso preconfiguradas:
echo  - Email: admin@editorcctv.com
echo  - Password: Admin1234!
echo ==========================================================
echo.
echo Siguiente paso: ejecutar .\\Iniciar_Servidor.bat o usar el acceso directo del Escritorio.
echo ok> ".\\installed.marker"
exit /b 0
`;

  const installSh = `#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js no encontrado. Por favor instala Node.js 20+ y vuelve a ejecutar install.sh"
  exit 1
fi

if [ ! -f "./tools/validate-package.mjs" ]; then
  echo "Falta tools/validate-package.mjs. El paquete está incompleto."
  exit 1
fi

if [ ! -f "./app/db/seed_custom.db" ]; then
  echo "Falta app/db/seed_custom.db. El paquete está incompleto."
  exit 1
fi

node "./tools/validate-package.mjs"

mkdir -p ./backups
mkdir -p ./app/db

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ -f "./app/db/custom.db" ]; then
  echo ""
  echo "Base de datos existente detectada: ./app/db/custom.db"
  echo ""
  echo "1) Actualizar y Preservar (Recomendado): Mantiene tus datos activos y genera copia de seguridad."
  echo "2) Instalación Limpia: Restaura la base de datos predeterminada y genera copia de seguridad preventiva."
  echo ""
  read -p "Selecciona una opción (1 o 2) [Default=1]: " CHOICE || CHOICE="1"
  CHOICE=\${CHOICE:-1}

  if [ "$CHOICE" = "2" ]; then
    echo "Generando copia de seguridad preventiva..."
    cp "./app/db/custom.db" "./app/db/custom.db.bak_\${TIMESTAMP}"
    cp "./app/db/custom.db" "./backups/custom.db.bak_\${TIMESTAMP}"
    echo "Restaurando catálogo predeterminado desde seed_custom.db..."
    cp "./app/db/seed_custom.db" "./app/db/custom.db"
  else
    echo "Generando copia de seguridad de respaldo..."
    cp "./app/db/custom.db" "./app/db/custom.db.bak_\${TIMESTAMP}"
    cp "./app/db/custom.db" "./backups/custom.db.bak_\${TIMESTAMP}"
    echo "Base de datos del usuario preservada e intacta."
  fi
else
  echo "Inicializando base de datos custom.db desde seed_custom.db..."
  cp "./app/db/seed_custom.db" "./app/db/custom.db"
fi

chmod +x ./start.sh ./install.sh 2>/dev/null || true
echo "Instalación completada con éxito."
echo "Siguiente paso: ejecutar ./start.sh"
echo "ok" > "./installed.marker"
`;

  const startBat = `@echo off
setlocal
cd /d "%~dp0"

if not exist ".\\installed.marker" (
  echo No se detecta instalacion previa. Ejecuta primero .\\install.bat
  exit /b 1
)

if not exist ".\\app\\db\\custom.db" (
  echo Base de datos no encontrada. Autocurando desde seed_custom.db...
  if exist ".\\app\\db\\seed_custom.db" (
    copy /y ".\\app\\db\\seed_custom.db" ".\\app\\db\\custom.db" >nul
  )
)

start "" "http://localhost:3000"
call ".\\start-server.cmd"
`;

  const startSh = `#!/bin/sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "./installed.marker" ]; then
  echo "No se detecta instalación previa. Ejecuta primero ./install.sh"
  exit 1
fi

if [ ! -f "./app/db/custom.db" ]; then
  echo "Base de datos no encontrada. Autocurando desde seed_custom.db..."
  if [ -f "./app/db/seed_custom.db" ]; then
    cp "./app/db/seed_custom.db" "./app/db/custom.db"
  fi
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:3000" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "http://localhost:3000" >/dev/null 2>&1 &
fi

node "./start-server.mjs"
`;

  const startScript = `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fsp, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(packageRoot, "app");
const dbDir = path.join(appDir, "db");
const customDbPath = path.join(dbDir, "custom.db");
const seedDbPath = path.join(dbDir, "seed_custom.db");

// Autocurativo: si custom.db no existe al iniciar, se restaura desde seed_custom.db
if (!existsSync(customDbPath) && existsSync(seedDbPath)) {
  try {
    await fsp.mkdir(dbDir, { recursive: true });
    await fsp.copyFile(seedDbPath, customDbPath);
    console.log("Base de datos autocurada desde seed_custom.db");
  } catch (err) {
    console.error("Error al autocurar custom.db:", err);
  }
}

const port = process.env.PORT || "3000";
const hostName = process.env.HOSTNAME || "0.0.0.0";
const absoluteDbPath = path.resolve(customDbPath);
const databaseUrl =
  process.env.DATABASE_URL ||
  \`file:\${absoluteDbPath.split(path.sep).join("/")}\`;

const child = spawn(process.execPath, ["server.js"], {
  cwd: appDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: port,
    HOSTNAME: hostName,
    DATABASE_URL: databaseUrl,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
`;

  const windowsLauncher = `@echo off
setlocal
node "%~dp0start-server.mjs" %*
`;

  const validateLauncher = `@echo off
setlocal
node "%~dp0tools\\validate-package.mjs" %*
`;

  const iniciarBat = `@echo off
title Iniciar Servidor - Editor CCTV
cd /d "%~dp0"

if not exist ".\\installed.marker" (
  call ".\\install.bat"
)

netstat -ano | findstr :3000 >nul 2>&1
if not errorlevel 1 (
  echo [i] El servidor ya se encuentra activo en http://localhost:3000
  start "" "http://localhost:3000"
  exit /b 0
)

echo ==========================================================
echo  Iniciando Servidor de Editor CCTV en http://localhost:3000...
echo ==========================================================
start "" "http://localhost:3000"
call ".\\start-server.cmd"
`;

  const detenerBat = `@echo off
title Detener Servidor - Editor CCTV
cd /d "%~dp0"

echo ==========================================================
echo  Deteniendo Servidor de Editor CCTV...
echo ==========================================================
node ".\\tools\\stop-server.mjs"
echo.
echo Presiona cualquier tecla para salir...
pause >nul
`;

  const controlBat = `@echo off
setlocal enabledelayedexpansion
title Gestor de Servidor - Editor CCTV
cd /d "%~dp0"

netstat -ano | findstr :3000 >nul 2>&1
if not errorlevel 1 (
  echo ==========================================================
  echo  [ESTADO: ACTIVO] Servidor de Editor CCTV en ejecucion
  echo ==========================================================
  echo.
  echo [1] Abrir aplicacion en navegador ^(http://localhost:3000^)
  echo [2] Detener servidor de forma segura
  echo [3] Salir
  echo.
  set CHOICE=1
  set /p CHOICE="Selecciona una opcion (1-3) [Default=1]: "
  if "!CHOICE!"=="2" (
    call ".\\Detener_Servidor.bat"
  ) else if "!CHOICE!"=="1" (
    start "" "http://localhost:3000"
  )
) else (
  echo ==========================================================
  echo  [ESTADO: INACTIVO] Servidor de Editor CCTV
  echo ==========================================================
  echo.
  echo [1] Iniciar Servidor
  echo [2] Salir
  echo.
  set CHOICE=1
  set /p CHOICE="Selecciona una opcion (1 o 2) [Default=1]: "
  if "!CHOICE!"=="1" (
    call ".\\Iniciar_Servidor.bat"
  )
)
`;

  await fsp.mkdir(path.join(PACKAGE_DIR, "tools"), { recursive: true });
  await fsp.writeFile(path.join(PACKAGE_DIR, "install.bat"), installBat, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "install.sh"), installSh, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "start.bat"), startBat, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "Iniciar_Servidor.bat"), iniciarBat, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "Detener_Servidor.bat"), detenerBat, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "Control_Servidor.bat"), controlBat, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "start.sh"), startSh, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "start-server.mjs"), startScript, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "start-server.cmd"), windowsLauncher, "utf8");
  await fsp.writeFile(path.join(PACKAGE_DIR, "validate-package.cmd"), validateLauncher, "utf8");

  const toolCopies = [
    ["shared.mjs", "shared.mjs"],
    ["validate-package.mjs", "validate-package.mjs"],
    ["backup-db.mjs", "backup-db.mjs"],
    ["restore-db.mjs", "restore-db.mjs"],
    ["stop-server.mjs", "stop-server.mjs"],
  ];

  for (const [sourceName, targetName] of toolCopies) {
    await copyPath(
      path.join(ROOT_DIR, "scripts", "distribution", sourceName),
      path.join(PACKAGE_DIR, "tools", targetName),
    );
  }
}

async function main() {
  const skipBuild = process.argv.includes("--skip-build");

  console.log("Empaquetando distribución verificable...");
  await fsp.mkdir(DIST_DIR, { recursive: true });
  if (await pathExists(PACKAGE_DIR)) {
    const previousDir = path.join(DIST_DIR, `package-prev-${Date.now()}`);
    try {
      await movePath(PACKAGE_DIR, previousDir);
    } catch {
      await fsp.rm(PACKAGE_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
  }
  await ensureCleanDirectory(PACKAGE_DIR);

  if (skipBuild) {
    console.log("1) Reutilizando build existente");
  } else {
    console.log("1) Ejecutando build de producción con webpack");
    await runCommand(process.execPath, [
      path.join(ROOT_DIR, "node_modules", "next", "dist", "bin", "next"),
      "build",
      "--webpack",
    ]);
  }

  console.log("2) Copiando artefactos obligatorios");
  const copiedArtifacts = await copyArtifacts();
  await writeRuntimeScripts();

  console.log("3) Generando manifiesto y checksums");
  const manifest = await writeManifest(PACKAGE_DIR);

  console.log("4) Validando integridad del paquete");
  const validation = await validatePackage(PACKAGE_DIR, { validateEnvironment: true });
  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }

  const summary = {
    generatedAt: manifest.generatedAt,
    packageDir: PACKAGE_DIR,
    artifactCount: manifest.files.length,
    copiedArtifacts,
    warnings: validation.warnings,
  };

  await fsp.writeFile(
    path.join(DIST_DIR, "build-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(`Paquete listo en: ${PACKAGE_DIR}`);
  console.log(`Archivos inventariados: ${manifest.files.length}`);
  if (validation.warnings.length > 0) {
    console.warn(`Advertencias: ${validation.warnings.join(" | ")}`);
  }
}

main().catch((error) => {
  console.error("Falló el empaquetado.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
