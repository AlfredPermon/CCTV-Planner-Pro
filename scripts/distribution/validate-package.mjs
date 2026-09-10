import path from "node:path";

import { parseCliArgs, resolvePackageDir, validatePackage } from "./shared.mjs";

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const packageDir = resolvePackageDir(import.meta.url, args["package-dir"]);
  const result = await validatePackage(packageDir, {
    validateEnvironment: !args["skip-environment"],
    hashConcurrency: args["hash-concurrency"],
  });

  console.log(`Paquete evaluado: ${path.resolve(packageDir)}`);

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`ADVERTENCIA: ${warning}`);
    }
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Integridad validada correctamente. Archivos verificados: ${result.manifest?.files.length ?? 0}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
