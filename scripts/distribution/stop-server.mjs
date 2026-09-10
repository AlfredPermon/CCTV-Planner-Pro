import { execSync } from "node:child_process";

function stopServer() {
  console.log("==========================================================");
  console.log(" Deteniendo Servidor de Editor CCTV...                    ");
  console.log("==========================================================");

  if (process.platform === "win32") {
    try {
      const output = execSync("netstat -ano | findstr :3000", { encoding: "utf8" });
      const lines = output.trim().split("\n");
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") {
          pids.add(pid);
        }
      }

      if (pids.size > 0) {
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`[+] Proceso de servidor (PID ${pid}) finalizado con éxito.`);
          } catch {
            // PID process might already be terminated
          }
        }
      } else {
        console.log("[i] No se detectó ningún servidor activo escuchando en el puerto 3000.");
      }
    } catch {
      console.log("[i] No se encontró proceso activo en el puerto 3000.");
    }
  } else {
    try {
      execSync("pkill -f 'server.js' || true");
      console.log("[+] Proceso de servidor finalizado.");
    } catch {
      console.log("[i] No se detectaron procesos activos.");
    }
  }

  console.log("==========================================================");
  console.log(" Servidor detenido correctamente. Sin procesos en segundo plano. ");
  console.log("==========================================================");
}

stopServer();
