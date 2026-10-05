import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

class PythonBridge {
  public async send(cmd: object): Promise<any> {
    const baseUrl = process.env.HC_03_URL;
    if (!baseUrl) {
      throw new Error("HC_03_URL environment variable is not set");
    }
    
    try {
      const response = await fetch(new URL("/cmd", baseUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cmd),
      });
      return await response.json();
    } catch (err: any) {
      return { status: "error", error: err.message || "Failed to fetch from HC-03 service" };
    }
  }
}

const bridge = new PythonBridge();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

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
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV === undefined) {
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
    console.log(Server running on http://0.0.0.0:);
  });
}

startServer();
