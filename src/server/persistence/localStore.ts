import fs from "node:fs";
import path from "node:path";
import { validatePayloadSafety } from "../../features/telemetry/analyticsEngine.ts";
import { INITIAL_DEVICES, INITIAL_SETTINGS } from "../../shared/defaults.ts";
import type {
  AppSettings,
  PeripheralDevice,
  TelemetryEnvelopeEvent,
} from "../../shared/types.ts";

export interface PersistedLocalState {
  consented: boolean;
  consentDecided: boolean;
  installId: string | null;
  settings: AppSettings;
  devices: PeripheralDevice[];
}

export class LocalDiskStore {
  private readonly dirPath: string;
  private readonly statePath: string;
  private readonly telemetryPath: string;
  private cachedState: PersistedLocalState | null = null;

  constructor(baseDir = path.resolve(process.cwd(), ".volttray")) {
    this.dirPath = baseDir;
    this.statePath = path.join(baseDir, "state.json");
    this.telemetryPath = path.join(baseDir, "telemetry.jsonl");
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dirPath)) {
      fs.mkdirSync(this.dirPath, { recursive: true, mode: 0o700 });
    }
  }

  public loadState(): PersistedLocalState {
    if (this.cachedState) return this.cachedState;

    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, "utf8");
        const parsed = JSON.parse(raw) as Partial<PersistedLocalState>;
        this.cachedState = {
          consented: Boolean(parsed.consented),
          consentDecided: Boolean(parsed.consentDecided),
          installId:
            typeof parsed.installId === "string" ? parsed.installId : null,
          settings: { ...INITIAL_SETTINGS, ...(parsed.settings ?? {}) },
          devices:
            Array.isArray(parsed.devices) && parsed.devices.length > 0
              ? parsed.devices
              : INITIAL_DEVICES,
        };
        return this.cachedState;
      }
    } catch {
      // Fall back to clean defaults if state file is corrupted
    }

    this.cachedState = {
      consented: false,
      consentDecided: false,
      installId: null,
      settings: INITIAL_SETTINGS,
      devices: INITIAL_DEVICES,
    };
    return this.cachedState;
  }

  public saveState(next: PersistedLocalState): PersistedLocalState {
    this.cachedState = next;
    this.ensureDir();
    const tmpPath = `${this.statePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.renameSync(tmpPath, this.statePath);
    return next;
  }

  public loadRecentTelemetry(limit = 100): TelemetryEnvelopeEvent[] {
    try {
      if (!fs.existsSync(this.telemetryPath)) return [];
      const lines = fs
        .readFileSync(this.telemetryPath, "utf8")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      const recent = lines.slice(-limit).reverse();
      return recent
        .map((line) => JSON.parse(line) as TelemetryEnvelopeEvent)
        .filter((ev) => validatePayloadSafety(ev).ok);
    } catch {
      return [];
    }
  }

  public appendTelemetry(events: TelemetryEnvelopeEvent[]): number {
    const state = this.loadState();
    if (!state.consented || !state.installId) {
      return 0;
    }

    const valid = events.filter((ev) => validatePayloadSafety(ev).ok);
    if (valid.length === 0) return 0;

    this.ensureDir();
    const existingLines = fs.existsSync(this.telemetryPath)
      ? fs.readFileSync(this.telemetryPath, "utf8").split("\n").filter(Boolean)
      : [];

    const combined = [
      ...existingLines,
      ...valid.map((ev) => JSON.stringify(ev)),
    ];
    // Cap local telemetry log at 1,000 events so disk usage stays bounded (<500 KB)
    const capped = combined.slice(-1000);
    fs.writeFileSync(this.telemetryPath, `${capped.join("\n")}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    return valid.length;
  }

  public wipeTelemetry(): void {
    try {
      if (fs.existsSync(this.telemetryPath)) {
        fs.unlinkSync(this.telemetryPath);
      }
    } catch {
      // Ignore unlink errors
    }
  }
}
