import express from "express";
import path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import readline from "readline";
import { createServer as createViteServer } from "vite";

class PythonBridge {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private queue: Array<(res: any) => void> = [];

  constructor() {
    this.start();
  }

  private start() {
    this.proc = spawn("python3", ["-u", "sim_bridge.py"]);
    const rl = readline.createInterface({ input: this.proc.stdout });

    rl.on("line", (line) => {
      const resolve = this.queue.shift();
      if (resolve) {
        try {
          resolve(JSON.parse(line));
        } catch (e) {
          resolve({ status: "error", error: "Failed to parse JSON response" });
        }
      }
    });

    this.proc.stderr.on("data", (data) => {
      console.error("[Python Bridge Error]:", data.toString());
    });

    this.proc.on("exit", (code) => {
      console.log(`Python bridge process exited with code ${code}, restarting...`);
      this.proc = null;
      // Drain any pending callbacks with an error so requests don't hang
      while (this.queue.length > 0) {
        const resolve = this.queue.shift();
        if (resolve) {
          resolve({ status: "error", error: "Simulation bridge restarted, please retry." });
        }
      }
      setTimeout(() => this.start(), 500);
    });
  }

  public send(cmd: object): Promise<any> {
    return new Promise((resolve) => {
      if (!this.proc || this.proc.killed) {
        this.start();
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const idx = this.queue.indexOf(safeResolve);
          if (idx !== -1) this.queue.splice(idx, 1);
          resolve({ status: "error", error: "Simulation bridge request timed out." });
        }
      }, 8000);

      const safeResolve = (res: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(res);
        }
      };

      this.queue.push(safeResolve);
      try {
        if (this.proc && this.proc.stdin.writable) {
          this.proc.stdin.write(JSON.stringify(cmd) + "\n");
        } else {
          safeResolve({ status: "error", error: "Bridge stdin not writable" });
        }
      } catch (err: any) {
        safeResolve({ status: "error", error: err.message || "Failed to write to simulation bridge" });
      }
    });
  }
}

const bridge = new PythonBridge();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "HC-03 Hospital Allocation Simulator" });
  });

  // Get current simulation state
  app.get("/api/sim/state", async (_req, res) => {
    try {
      const result = await bridge.send({ cmd: "state" });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Step simulation forward
  app.post("/api/sim/step", async (req, res) => {
    try {
      const steps = req.body.steps || 1;
      const result = await bridge.send({ cmd: "step", steps });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Reset simulation to seed 20260911
  app.post("/api/sim/reset", async (_req, res) => {
    try {
      const result = await bridge.send({ cmd: "reset" });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
