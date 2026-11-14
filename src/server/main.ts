import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import {
  detectHostEnvironment,
  probeLinuxPowerSnapshot,
} from "./hardware/linuxProbe.ts";
import {
  detectLinuxCapabilities,
  executeLinuxHardwareAction,
  type HardwareActionRequest,
} from "./hardware/linuxControls.ts";
import { LocalDiskStore } from "./persistence/localStore.ts";
import { listenLocalOnly } from "./http/listen.ts";
import type { TelemetryEnvelopeEvent } from "../shared/types.ts";

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

function getLinuxAutostartFile(): string {
  const configBase =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configBase, "autostart", "volttray.desktop");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  const store = new LocalDiskStore();

  // Strictly local-only API routes (zero outbound cloud requests)
  app.get("/api/health", (_req, res) => {
    const host = detectHostEnvironment();
    const capabilities = detectLinuxCapabilities();
    res.json({
      ok: true,
      mode: "local_only",
      host,
      capabilities,
    });
  });

  app.get("/api/local/bootstrap", (_req, res) => {
    const persisted = store.loadState();
    const host = detectHostEnvironment();
    const snapshot = probeLinuxPowerSnapshot();
    const autostartPath = getLinuxAutostartFile();
    const autostartEnabled =
      process.platform === "linux" && fs.existsSync(autostartPath)
        ? true
        : persisted.settings.launchAtLogin;

    res.json({
      mode: "local_only",
      host,
      chargerConnected: snapshot.chargerConnected,
      autostartEnabled,
      settings: persisted.settings,
      devices: snapshot.devices,
      probedHardwareCount: snapshot.devices.length,
    });
  });

  app.get("/api/local/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    let lastJson = "";
    const emitSnapshot = () => {
      const snapshot = probeLinuxPowerSnapshot();
      const payload = JSON.stringify({
        mode: "local_only",
        chargerConnected: snapshot.chargerConnected,
        devices: snapshot.devices,
        probedHardwareCount: snapshot.devices.length,
      });
      if (payload !== lastJson) {
        lastJson = payload;
        res.write(`data: ${payload}\n\n`);
      }
    };

    emitSnapshot();
    const timer = setInterval(emitSnapshot, 1500);
    req.on("close", () => {
      clearInterval(timer);
    });
  });

  app.post("/api/local/autostart", (req, res) => {
    const enabled = Boolean(req.body?.enabled);
    const current = store.loadState();
    store.saveState({
      ...current,
      settings: {
        ...current.settings,
        launchAtLogin: enabled,
      },
    });

    if (process.platform === "linux") {
      try {
        const file = getLinuxAutostartFile();
        if (enabled) {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          const appDir = process.cwd();
          const desktopEntry = `[Desktop Entry]\nType=Application\nName=VoltTray\nComment=Local Battery & Charger Monitor\nExec=sh -c "cd '${appDir}' && npm run start"\nTerminal=false\nX-GNOME-Autostart-enabled=true\nCategories=Utility;System;\n`;
          fs.writeFileSync(file, desktopEntry, "utf8");
        } else if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Ignore if sandbox filesystem forbids writing $HOME/.config/autostart
      }
    }

    res.json({ ok: true, enabled });
  });

  app.post("/api/local/action", (req, res) => {
    const body = (req.body ?? {}) as HardwareActionRequest;
    const result = executeLinuxHardwareAction(body);
    res.json(result);
  });

  app.post("/api/local/state", (req, res) => {
    const current = store.loadState();
    const body = req.body ?? {};
    const next = store.saveState({
      consented:
        typeof body.consented === "boolean"
          ? body.consented
          : current.consented,
      consentDecided:
        typeof body.consentDecided === "boolean"
          ? body.consentDecided
          : current.consentDecided,
      installId:
        body.installId === null || typeof body.installId === "string"
          ? body.installId
          : current.installId,
      settings: body.settings
        ? { ...current.settings, ...body.settings }
        : current.settings,
      devices:
        Array.isArray(body.devices) && body.devices.length > 0
          ? body.devices
          : current.devices,
    });

    if (!next.consented) {
      store.wipeTelemetry();
    }

    res.json({ ok: true });
  });

  app.post("/api/local/telemetry", (req, res) => {
    const events = Array.isArray(req.body?.events)
      ? (req.body.events as TelemetryEnvelopeEvent[])
      : [];
    const written = store.appendTelemetry(events);
    res.json({ ok: true, written });
  });

  app.post("/api/local/telemetry/reset", (_req, res) => {
    const current = store.loadState();
    store.wipeTelemetry();
    store.saveState({
      ...current,
      installId: null,
    });
    res.json({ ok: true });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  listenLocalOnly(app, PORT, () => {
    console.log(`VoltTray local server listening on http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start VoltTray local server:", err);
  process.exit(1);
});
