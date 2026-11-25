import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..");
const backendDir = path.resolve(frontendDir, "..", "backend");
const nextBin = path.join(frontendDir, "node_modules", "next", "dist", "bin", "next");

async function isBackendAlreadyRunning() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("http://127.0.0.1:8001/health", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.service === "fpt-classswap-backend";
  } catch {
    return false;
  }
}

function killTree(proc) {
  if (!proc || proc.killed || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      proc.kill("SIGTERM");
    }
  } catch {
    // ignore cleanup error
  }
}

async function main() {
  let backendProc = null;

  // Skip spawning local uvicorn if running inside Vercel CLI (`vercel dev`)
  const managedByVercel = Boolean(process.env.VERCEL || process.env.BACKEND_URL);

  if (!managedByVercel) {
    const alreadyUp = await isBackendAlreadyRunning();
    if (alreadyUp) {
      console.log("\x1b[36m[backend]\x1b[0m Already running on http://127.0.0.1:8001 — reusing existing server.");
    } else {
      const pyCmd = process.platform === "win32" ? "python" : "python3";
      console.log("\x1b[36m[backend]\x1b[0m Starting FastAPI on http://127.0.0.1:8001 ...");
      backendProc = spawn(
        pyCmd,
        ["-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8001"],
        {
          cwd: backendDir,
          stdio: "inherit",
          env: { ...process.env },
        }
      );

      backendProc.on("error", (err) => {
        console.error(
          `\x1b[31m[backend]\x1b[0m Failed to start Python backend (${err.message}). Make sure Python & uvicorn are installed.`
        );
      });
    }
  }

  const nextArgs = ["dev", ...process.argv.slice(2)];
  const nextProc = spawn(process.execPath, [nextBin, ...nextArgs], {
    cwd: frontendDir,
    stdio: "inherit",
    env: { ...process.env },
  });

  const shutdown = (code = 0) => {
    killTree(backendProc);
    killTree(nextProc);
    process.exit(code);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  nextProc.on("exit", (code) => {
    killTree(backendProc);
    process.exit(code ?? 0);
  });
}

main();
