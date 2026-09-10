import { promises as fsp } from "node:fs";
import path from "node:path";

import { parseCliArgs, resolvePackageDir } from "./shared.mjs";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const packageDir = resolvePackageDir(import.meta.url, args["package-dir"]);
  const sourcePath = args.source ? path.resolve(process.cwd(), args.source) : null;
  const dbPath = path.join(packageDir, "app", "db", "custom.db");
  const backupPath = path.join(
    packageDir,
    "backups",
    `pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.db`,
  );

  if (!sourcePath) {
    throw new Error("Debes indicar --source con la ruta del respaldo a restaurar.");
  }

  await fsp.mkdir(path.dirname(backupPath), { recursive: true });
  await fsp.copyFile(dbPath, backupPath);
  await fsp.copyFile(sourcePath, dbPath);

  console.log(`Base restaurada desde: ${sourcePath}`);
  console.log(`Respaldo previo almacenado en: ${backupPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
