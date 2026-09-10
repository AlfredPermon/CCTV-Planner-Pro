import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SCRIPT_DIR, "..", "..");
export const DIST_DIR = path.join(ROOT_DIR, "dist", "distribution");
export const PACKAGE_DIR = path.join(DIST_DIR, "package");
export const MANIFEST_FILE = "artifact-manifest.json";
export const MANIFEST_PATH = path.join(PACKAGE_DIR, MANIFEST_FILE);
export const CHECKSUMS_FILE = "checksums.sha256";
export const CHECKSUMS_PATH = path.join(PACKAGE_DIR, CHECKSUMS_FILE);
export const MIN_NODE_VERSION = "20.0.0";
export const SUPPORTED_PLATFORMS = ["win32", "linux", "darwin"];

export const REQUIRED_ENTRIES = [
  {
    type: "dir",
    relativePath: "app",
    description: "Aplicación standalone lista para ejecutar",
  },
  {
    type: "file",
    relativePath: "app/server.js",
    description: "Servidor standalone de Next.js",
  },
  {
    type: "dir",
    relativePath: "app/.next/static",
    description: "Activos estáticos compilados",
  },
  {
    type: "dir",
    relativePath: "app/public",
    description: "Recursos públicos de la aplicación",
  },
  {
    type: "file",
    relativePath: "app/db/seed_custom.db",
    description: "Plantilla de base de datos inicial (semilla)",
  },
  {
    type: "file",
    relativePath: "app/prisma/schema.prisma",
    description: "Esquema Prisma para recuperación y soporte",
  },
  {
    type: "file",
    relativePath: "start-server.mjs",
    description: "Script de arranque del paquete",
  },
  {
    type: "file",
    relativePath: "install.bat",
    description: "Instalación automatizada (Windows)",
  },
  {
    type: "file",
    relativePath: "install.sh",
    description: "Instalación automatizada (Linux/macOS)",
  },
  {
    type: "file",
    relativePath: "start.bat",
    description: "Arranque simplificado (Windows)",
  },
  {
    type: "file",
    relativePath: "Iniciar_Servidor.bat",
    description: "Icono de inicio del servidor en Windows",
  },
  {
    type: "file",
    relativePath: "Detener_Servidor.bat",
    description: "Icono de detención segura del servidor en Windows",
  },
  {
    type: "file",
    relativePath: "Control_Servidor.bat",
    description: "Gestor interactivo del servidor en Windows",
  },
  {
    type: "file",
    relativePath: "start.sh",
    description: "Arranque simplificado (Linux/macOS)",
  },
  {
    type: "file",
    relativePath: "README.md",
    description: "Guía de instalación, verificación y recuperación",
  },
  {
    type: "file",
    relativePath: "tools/validate-package.mjs",
    description: "Validador de integridad del paquete",
  },
  {
    type: "file",
    relativePath: "tools/stop-server.mjs",
    description: "Herramienta para finalizar el servidor sin procesos residuales",
  },
];

export const ARTIFACTS_TO_COPY = [
  {
    source: path.join(ROOT_DIR, ".next", "standalone"),
    destination: path.join(PACKAGE_DIR, "app"),
    required: true,
    label: ".next/standalone",
  },
  {
    source: path.join(ROOT_DIR, ".next", "static"),
    destination: path.join(PACKAGE_DIR, "app", ".next", "static"),
    required: true,
    label: ".next/static",
  },
  {
    source: path.join(ROOT_DIR, "public"),
    destination: path.join(PACKAGE_DIR, "app", "public"),
    required: true,
    label: "public",
  },
  {
    source: path.join(ROOT_DIR, "prisma", "dev.db"),
    destination: path.join(PACKAGE_DIR, "app", "db", "seed_custom.db"),
    required: true,
    label: "db/seed_custom.db",
  },
  {
    source: path.join(ROOT_DIR, "prisma", "schema.prisma"),
    destination: path.join(PACKAGE_DIR, "app", "prisma", "schema.prisma"),
    required: true,
    label: "prisma/schema.prisma",
  },
  {
    source: path.join(ROOT_DIR, "download", "README.md"),
    destination: path.join(PACKAGE_DIR, "README.md"),
    required: true,
    label: "download/README.md",
  },
];

export function normalizeRelativePath(value) {
  return value.split(path.sep).join("/");
}

export async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureCleanDirectory(targetPath) {
  await fsp.rm(targetPath, { recursive: true, force: true });
  await fsp.mkdir(targetPath, { recursive: true });
}

export async function copyPath(source, destination, options = {}) {
  const stats = await fsp.stat(source);
  await fsp.mkdir(path.dirname(destination), { recursive: true });

  if (stats.isDirectory()) {
    await fsp.cp(source, destination, {
      recursive: true,
      force: true,
      dereference: true,
      filter: options.filter
        ? (sourcePath) => options.filter(sourcePath, source)
        : undefined,
    });
    return;
  }

  await fsp.copyFile(source, destination);
}

export async function movePath(source, destination) {
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.rm(destination, { recursive: true, force: true });
  await fsp.rename(source, destination);
}

export async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });

  return hash.digest("hex");
}

export async function collectFiles(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      files.push(absolutePath);
    }
  }

  if (await pathExists(rootDir)) {
    await walk(rootDir);
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export async function buildFileInventory(packageDir) {
  const files = await collectFiles(packageDir);
  const trackedFiles = files.filter((filePath) => {
    const relativePath = normalizeRelativePath(path.relative(packageDir, filePath));
    return ![MANIFEST_FILE, CHECKSUMS_FILE].includes(relativePath);
  });

  const entries = new Array(trackedFiles.length);
  const hashConcurrency = 16;
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(hashConcurrency, trackedFiles.length || 1) }, async () => {
      while (cursor < trackedFiles.length) {
        const index = cursor;
        cursor += 1;
        const filePath = trackedFiles[index];
        const stats = await fsp.stat(filePath);
        const sha256 = await hashFile(filePath);
        entries[index] = {
          path: normalizeRelativePath(path.relative(packageDir, filePath)),
          size: stats.size,
          sha256,
        };
      }
    }),
  );

  return entries;
}

export async function writeChecksumsFile(packageDir, files) {
  const content = files
    .map((file) => `${file.sha256} *${file.path}`)
    .join("\n");

  await fsp.writeFile(path.join(packageDir, CHECKSUMS_FILE), `${content}\n`, "utf8");
}

export async function writeManifest(packageDir) {
  const packageJson = JSON.parse(
    await fsp.readFile(path.join(ROOT_DIR, "package.json"), "utf8"),
  );
  const files = await buildFileInventory(packageDir);

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    appName: packageJson.name,
    appVersion: packageJson.version,
    minNodeVersion: MIN_NODE_VERSION,
    supportedPlatforms: SUPPORTED_PLATFORMS,
    requiredEntries: REQUIRED_ENTRIES,
    files,
  };

  await fsp.writeFile(
    path.join(packageDir, MANIFEST_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await writeChecksumsFile(packageDir, files);

  return manifest;
}

export function compareNodeVersion(currentVersion, minimumVersion) {
  const toParts = (value) =>
    value
      .replace(/^v/, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const current = toParts(currentVersion);
  const minimum = toParts(minimumVersion);
  const size = Math.max(current.length, minimum.length);

  for (let index = 0; index < size; index += 1) {
    const currentPart = current[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;

    if (currentPart > minimumPart) return 1;
    if (currentPart < minimumPart) return -1;
  }

  return 0;
}

export async function validatePackage(packageDir, options = {}) {
  const validateEnvironment = options.validateEnvironment ?? true;
  const hashConcurrency = Number.parseInt(options.hashConcurrency ?? "8", 10) || 8;
  const errors = [];
  const warnings = [];
  const manifestPath = path.join(packageDir, MANIFEST_FILE);

  if (!(await pathExists(packageDir))) {
    return {
      ok: false,
      errors: [`No existe el paquete a validar: ${packageDir}`],
      warnings,
      manifest: null,
    };
  }

  if (!(await pathExists(manifestPath))) {
    return {
      ok: false,
      errors: [`Falta el manifiesto de artefactos: ${manifestPath}`],
      warnings,
      manifest: null,
    };
  }

  const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));

  if (validateEnvironment) {
    if (!manifest.supportedPlatforms.includes(process.platform)) {
      errors.push(
        `Plataforma no soportada: ${process.platform}. Permitidas: ${manifest.supportedPlatforms.join(", ")}`,
      );
    }

    if (compareNodeVersion(process.version, manifest.minNodeVersion) < 0) {
      errors.push(
        `Node.js ${process.version} es inferior al mínimo requerido ${manifest.minNodeVersion}`,
      );
    }
  }

  for (const requiredEntry of manifest.requiredEntries) {
    const absolutePath = path.join(packageDir, requiredEntry.relativePath);

    if (!(await pathExists(absolutePath))) {
      errors.push(`Falta artefacto obligatorio: ${requiredEntry.relativePath}`);
      continue;
    }

    const stats = await fsp.stat(absolutePath);
    if (requiredEntry.type === "file" && !stats.isFile()) {
      errors.push(`Se esperaba archivo y se encontró otro tipo: ${requiredEntry.relativePath}`);
    }
    if (requiredEntry.type === "dir" && !stats.isDirectory()) {
      errors.push(`Se esperaba directorio y se encontró otro tipo: ${requiredEntry.relativePath}`);
    }
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(hashConcurrency, files.length || 1) }, async () => {
      while (cursor < files.length) {
        const index = cursor;
        cursor += 1;
        const file = files[index];
        const absolutePath = path.join(packageDir, file.path);

        if (!(await pathExists(absolutePath))) {
          errors.push(`Archivo listado en manifiesto no existe: ${file.path}`);
          continue;
        }

        const stats = await fsp.stat(absolutePath);
        if (!stats.isFile()) {
          errors.push(`Entrada del manifiesto no es un archivo: ${file.path}`);
          continue;
        }

        if (stats.size !== file.size) {
          errors.push(
            `Tamaño inesperado en ${file.path}: esperado ${file.size}, actual ${stats.size}`,
          );
        }

        const currentHash = await hashFile(absolutePath);
        if (currentHash !== file.sha256) {
          errors.push(`Hash SHA-256 inválido en ${file.path}`);
        }
      }
    }),
  );

  const actualFiles = await buildFileInventory(packageDir);
  const actualFileSet = new Set(actualFiles.map((file) => file.path));
  for (const expectedFile of manifest.files) {
    actualFileSet.delete(expectedFile.path);
  }

  if (actualFileSet.size > 0) {
    warnings.push(
      `Se detectaron archivos adicionales no registrados: ${Array.from(actualFileSet)
        .sort()
        .join(", ")}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    manifest,
  };
}

export function resolvePackageDir(fromFileUrl, cliPackageDir) {
  if (cliPackageDir) {
    return path.resolve(process.cwd(), cliPackageDir);
  }

  const currentDir = path.dirname(fileURLToPath(fromFileUrl));
  const candidates = [
    currentDir,
    path.resolve(currentDir, ".."),
    path.resolve(currentDir, "..", "..", "dist", "distribution", "package"),
    PACKAGE_DIR,
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(path.join(candidate, "app")) ||
      fs.existsSync(path.join(candidate, MANIFEST_FILE))
    ) {
      return candidate;
    }
  }

  return PACKAGE_DIR;
}

export function parseCliArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;

    const key = item.slice(2);
    const nextItem = argv[index + 1];

    if (!nextItem || nextItem.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = nextItem;
    index += 1;
  }

  return args;
}

export async function runCommand(command, args, options = {}) {
  const needsShell =
    process.platform === "win32" &&
    [".cmd", ".bat"].includes(path.extname(command).toLowerCase());

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT_DIR,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        ...(options.env ?? {}),
      },
      stdio: "inherit",
      shell: needsShell,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`El comando "${command} ${args.join(" ")}" terminó con código ${code}`));
    });
  });
}

export function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
