import path from "node:path";

import { parseCliArgs, resolvePackageDir, writeManifest } from "./shared.mjs";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const packageDir = resolvePackageDir(import.meta.url, args["package-dir"]);

  const manifest = await writeManifest(packageDir);
  console.log(`Paquete evaluado: ${path.resolve(packageDir)}`);
  console.log(`Manifiesto regenerado: ${manifest.generatedAt}`);
  console.log(`Archivos inventariados: ${manifest.files.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
