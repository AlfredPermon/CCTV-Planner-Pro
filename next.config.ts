import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: path.resolve(process.cwd(), "src/shims/empty-canvas.js"),
    };

    // --- Fix "Watchpack Error (initial scan): EINVAL ... C:\pagefile.sys" en Windows ---
    // Watchpack (watcher de archivos de webpack) escanea TODAS las rutas que
    // recibe, incluidas las de `ignored`. En Windows, los globstars
    // ("**/node_modules/**") se resuelven contra cada unidad montada (C:\, D:\),
    // por lo que el escaneo terminaba alcanzando archivos del sistema protegidos
    // en la raíz de C:\ (pagefile.sys, swapfile.sys, System Volume Information,
    // DumpStack.log.tmp) y producía errores EINVAL.
    // Solución: ignorar únicamente RUTAS ABSOLUTAS restringidas al proyecto
    // (sin globs que puedan escapar al disco del SO). Se aplica a TODOS los
    // compiladores (server y cliente) porque ambos observan el filesystem;
    // esto no altera ninguna lógica de negocio ni de resolución de módulos.
    const projectRoot = process.cwd();

    config.watchOptions = {
      ignored: [
        /[\\/](?:node_modules|\.next|dist|coverage|\.git)([\\/]|$)/i,
        path.join(projectRoot, "node_modules"),
        path.join(projectRoot, ".next"),
        path.join(projectRoot, "dist"),
        path.join(projectRoot, "coverage"),
      ],
      followSymlinks: false,
      aggregateTimeout: 100,
    };

    return config;
  },

  turbopack: {
    resolveAlias: {
      canvas: "./src/shims/empty-canvas.js",
    },
  },
};

export default nextConfig;
