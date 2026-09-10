import { promises as fsp } from "node:fs";
import path from "node:path";

import { parseCliArgs, resolvePackageDir } from "./shared.mjs";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const packageDir = resolvePackageDir(import.meta.url, args["package-dir"]);
  const dbPath = path.join(packageDir, "app", "db", "custom.db");
  const backupsDir = path.join(packageDir, "backups");
  const targetPath =
    args.output ??
    path.join(backupsDir, `custom-${timestamp()}.db`);

  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.copyFile(dbPath, targetPath);

  console.log(`Respaldo generado: ${targetPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
