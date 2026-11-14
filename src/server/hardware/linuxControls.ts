import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface LinuxCapabilities {
  os: "linux" | "windows" | "other";
  sysfsAvailable: boolean;
  upowerAvailable: boolean;
  audioControl: "wpctl" | "pactl" | "none";
  ratbagctlAvailable: boolean;
  sysfsLedWritable: boolean;
  notifySendAvailable: boolean;
  udevHidrawAccess: "granted" | "denied" | "not_applicable";
}

export interface HardwareActionRequest {
  action:
    | "toggle_mic_mute"
    | "set_dpi"
    | "toggle_rgb"
    | "send_low_battery_alert";
  muted?: boolean;
  dpi?: number;
  rgbOff?: boolean;
  title?: string;
  body?: string;
}

export interface HardwareActionResult {
  ok: boolean;
  appliedToHardware: boolean;
  backend: string;
  micMuted?: boolean;
  messageEn: string;
  messageMn: string;
}

export function commandExists(cmd: string): boolean {
  if (process.platform !== "linux") return false;
  try {
    execFileSync("which", [cmd], { stdio: "ignore", timeout: 800 });
    return true;
  } catch {
    return false;
  }
}

export function parseWpctlMuteOutput(stdout: string): boolean | null {
  // Example: "Volume: 0.85 [MUTED]" or "Volume: 0.85"
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  if (/\[MUTED\]/i.test(trimmed)) return true;
  if (/^Volume:/i.test(trimmed)) return false;
  return null;
}

export function parsePactlMuteOutput(stdout: string): boolean | null {
  // Example: "Mute: yes" or "Mute: no"
  const match = stdout.match(/Mute:\s*(yes|no)/i);
  if (!match) return null;
  return match[1].toLowerCase() === "yes";
}

export function parseRatbagDeviceId(stdout: string): string | null {
  // Example: "holo-slug-123:       Logitech G Pro Wireless"
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      return trimmed.slice(0, colonIdx).trim();
    }
  }
  return null;
}

export function findWritableSysfsLeds(): string[] {
  if (process.platform !== "linux") return [];
  const base = "/sys/class/leds";
  try {
    if (!fs.existsSync(base)) return [];
    return fs
      .readdirSync(base)
      .filter((name) =>
        /rgb|kbd_backlight|mouse|keyboard|scrolllock|numlock/i.test(name),
      )
      .map((name) => path.join(base, name, "brightness"))
      .filter((brightnessPath) => {
        try {
          fs.accessSync(brightnessPath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

export function detectLinuxCapabilities(): LinuxCapabilities {
  if (process.platform !== "linux") {
    return {
      os: process.platform === "win32" ? "windows" : "other",
      sysfsAvailable: false,
      upowerAvailable: false,
      audioControl: "none",
      ratbagctlAvailable: false,
      sysfsLedWritable: false,
      notifySendAvailable: false,
      udevHidrawAccess: "not_applicable",
    };
  }

  const audioControl: LinuxCapabilities["audioControl"] = commandExists("wpctl")
    ? "wpctl"
    : commandExists("pactl")
      ? "pactl"
      : "none";

  let udevHidrawAccess: LinuxCapabilities["udevHidrawAccess"] =
    "not_applicable";
  try {
    const devEntries = fs
      .readdirSync("/dev")
      .filter((n) => n.startsWith("hidraw"));
    if (devEntries.length > 0) {
      const anyWritable = devEntries.some((entry) => {
        try {
          fs.accessSync(
            path.join("/dev", entry),
            fs.constants.R_OK | fs.constants.W_OK,
          );
          return true;
        } catch {
          return false;
        }
      });
      udevHidrawAccess = anyWritable ? "granted" : "denied";
    }
  } catch {
    udevHidrawAccess = "not_applicable";
  }

  return {
    os: "linux",
    sysfsAvailable: fs.existsSync("/sys/class/power_supply"),
    upowerAvailable: commandExists("upower"),
    audioControl,
    ratbagctlAvailable: commandExists("ratbagctl"),
    sysfsLedWritable: findWritableSysfsLeds().length > 0,
    notifySendAvailable: commandExists("notify-send"),
    udevHidrawAccess,
  };
}

export function readLinuxMicMuted(): boolean | null {
  if (process.platform !== "linux") return null;

  if (commandExists("wpctl")) {
    try {
      const out = execFileSync(
        "wpctl",
        ["get-volume", "@DEFAULT_AUDIO_SOURCE@"],
        {
          encoding: "utf8",
          timeout: 1000,
        },
      );
      return parseWpctlMuteOutput(out);
    } catch {
      // fall through
    }
  }

  if (commandExists("pactl")) {
    try {
      const out = execFileSync(
        "pactl",
        ["get-source-mute", "@DEFAULT_SOURCE@"],
        {
          encoding: "utf8",
          timeout: 1000,
        },
      );
      return parsePactlMuteOutput(out);
    } catch {
      return null;
    }
  }

  return null;
}

const savedLedBrightness = new Map<string, string>();

export function executeLinuxHardwareAction(
  req: HardwareActionRequest,
): HardwareActionResult {
  if (process.platform !== "linux") {
    return {
      ok: true,
      appliedToHardware: false,
      backend: "local_profile",
      messageEn: "Saved locally (not running on Linux host)",
      messageMn: "Локал төлөвт хадгалагдлаа (Linux систем биш)",
    };
  }

  if (req.action === "toggle_mic_mute") {
    const targetMuted = Boolean(req.muted);
    if (commandExists("wpctl")) {
      try {
        execFileSync(
          "wpctl",
          ["set-mute", "@DEFAULT_AUDIO_SOURCE@", targetMuted ? "1" : "0"],
          {
            timeout: 1000,
          },
        );
        const confirmed = readLinuxMicMuted();
        return {
          ok: true,
          appliedToHardware: true,
          backend: "wpctl",
          micMuted: confirmed ?? targetMuted,
          messageEn: targetMuted
            ? "Mic muted via PipeWire (wpctl)"
            : "Mic unmuted via PipeWire (wpctl)",
          messageMn: targetMuted
            ? "PipeWire (wpctl)-ээр микрофон хаалаа"
            : "PipeWire (wpctl)-ээр микрофон нээлээ",
        };
      } catch {
        // fall through to pactl
      }
    }

    if (commandExists("pactl")) {
      try {
        execFileSync(
          "pactl",
          ["set-source-mute", "@DEFAULT_SOURCE@", targetMuted ? "1" : "0"],
          {
            timeout: 1000,
          },
        );
        const confirmed = readLinuxMicMuted();
        return {
          ok: true,
          appliedToHardware: true,
          backend: "pactl",
          micMuted: confirmed ?? targetMuted,
          messageEn: targetMuted
            ? "Mic muted via PulseAudio (pactl)"
            : "Mic unmuted via PulseAudio (pactl)",
          messageMn: targetMuted
            ? "PulseAudio (pactl)-ээр микрофон хаалаа"
            : "PulseAudio (pactl)-ээр микрофон нээлээ",
        };
      } catch {
        // fall through
      }
    }

    return {
      ok: true,
      appliedToHardware: false,
      backend: "local_profile",
      micMuted: targetMuted,
      messageEn: "Saved locally (wpctl/pactl not found on host)",
      messageMn: "Локал төлөвт хадгалагдлаа (wpctl/pactl олдсонгүй)",
    };
  }

  if (req.action === "set_dpi") {
    const dpi = Math.max(200, Math.min(26000, Math.round(req.dpi ?? 1600)));
    if (commandExists("ratbagctl")) {
      try {
        const listOut = execFileSync("ratbagctl", ["list"], {
          encoding: "utf8",
          timeout: 1200,
        });
        const devId = parseRatbagDeviceId(listOut);
        if (devId) {
          execFileSync("ratbagctl", [devId, "dpi", "set", String(dpi)], {
            timeout: 1200,
          });
          return {
            ok: true,
            appliedToHardware: true,
            backend: "ratbagctl",
            messageEn: `Applied ${dpi} DPI to hardware via libratbag`,
            messageMn: `libratbag-аар хулганы DPI-г ${dpi} болголоо`,
          };
        }
      } catch {
        // fall through
      }
    }

    return {
      ok: true,
      appliedToHardware: false,
      backend: "local_profile",
      messageEn: `DPI ${dpi} saved locally (install libratbag/ratbagctl for HID write)`,
      messageMn: `DPI ${dpi} локалд хадгалагдлаа (бодит бичихэд libratbag хэрэгтэй)`,
    };
  }

  if (req.action === "toggle_rgb") {
    const turnOff = Boolean(req.rgbOff);
    if (commandExists("ratbagctl")) {
      try {
        const listOut = execFileSync("ratbagctl", ["list"], {
          encoding: "utf8",
          timeout: 1200,
        });
        const devId = parseRatbagDeviceId(listOut);
        if (devId) {
          execFileSync(
            "ratbagctl",
            [devId, "led", "0", "set", "mode", turnOff ? "off" : "on"],
            {
              timeout: 1200,
            },
          );
          return {
            ok: true,
            appliedToHardware: true,
            backend: "ratbagctl",
            messageEn: turnOff
              ? "Hardware LED turned off via libratbag"
              : "Hardware LED restored via libratbag",
            messageMn: turnOff
              ? "libratbag-аар гэрэл унтраалаа"
              : "libratbag-аар гэрэл асаалаа",
          };
        }
      } catch {
        // fall through to sysfs LEDs
      }
    }

    const leds = findWritableSysfsLeds();
    if (leds.length > 0) {
      let wroteAny = false;
      for (const brightnessPath of leds) {
        try {
          if (turnOff) {
            const curr = fs.readFileSync(brightnessPath, "utf8").trim();
            if (curr && curr !== "0")
              savedLedBrightness.set(brightnessPath, curr);
            fs.writeFileSync(brightnessPath, "0", "utf8");
          } else {
            const prev = savedLedBrightness.get(brightnessPath) ?? "128";
            fs.writeFileSync(brightnessPath, prev, "utf8");
          }
          wroteAny = true;
        } catch {
          // ignore single LED failure
        }
      }
      if (wroteAny) {
        return {
          ok: true,
          appliedToHardware: true,
          backend: "sysfs_leds",
          messageEn: turnOff
            ? "LED backlight turned off via Linux sysfs"
            : "LED backlight restored via Linux sysfs",
          messageMn: turnOff
            ? "Linux sysfs-ээр гэрэл унтраалаа"
            : "Linux sysfs-ээр гэрэл асаалаа",
        };
      }
    }

    return {
      ok: true,
      appliedToHardware: false,
      backend: "local_profile",
      messageEn:
        "RGB eco estimate saved locally (no writable HID/LED driver found)",
      messageMn: "Цаг хэмнэлт локалд хадгалагдлаа (HID/LED бичих эрх алга)",
    };
  }

  if (req.action === "send_low_battery_alert") {
    if (commandExists("notify-send")) {
      try {
        execFileSync(
          "notify-send",
          [
            "-a",
            "VoltTray",
            "-u",
            "normal",
            req.title ?? "Low Battery",
            req.body ?? "Plug in peripheral",
          ],
          { timeout: 1000 },
        );
        return {
          ok: true,
          appliedToHardware: true,
          backend: "notify-send",
          messageEn: "Sent native Linux desktop notification",
          messageMn: "Linux системийн мэдэгдэл илгээлээ",
        };
      } catch {
        // fall through
      }
    }
  }

  return {
    ok: true,
    appliedToHardware: false,
    backend: "local_profile",
    messageEn: "Alert displayed in local overlay",
    messageMn: "Анхааруулга цонхонд харагдлаа",
  };
}
