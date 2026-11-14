import type {
  BatteryLevelBand,
  ConnectionType,
  PeripheralDevice,
} from "../../shared/types";

export type BatteryPctBucket =
  | "0_to_5"
  | "6_to_10"
  | "11_to_15"
  | "16_to_20"
  | "21_to_40"
  | "41_to_60"
  | "61_to_79"
  | "80_limit"
  | "81_to_99"
  | "100";

export type HealthPctBucket =
  | "90_to_100"
  | "80_to_89"
  | "70_to_79"
  | "lt_70"
  | "unknown";

export type HoursBucket =
  | "lt_2h"
  | "2_to_5h"
  | "6_to_10h"
  | "11_to_20h"
  | "21_to_40h"
  | "gt_40h"
  | "not_applicable";

export type GainHoursBucket =
  | "1_to_3h"
  | "4_to_8h"
  | "9_to_15h"
  | "gt_15h"
  | "not_applicable";

export type ChargeMinsLeftBucket =
  | "lt_15m"
  | "15_to_30m"
  | "31_to_60m"
  | "gt_60m"
  | "not_charging";

export type SleepTimerMinsBucket =
  | "none"
  | "1_to_5m"
  | "6_to_15m"
  | "16_to_30m"
  | "gt_30m";

export type DeviceCountBucket = "0" | "1" | "2_3" | "4_plus";

export type ThresholdCrossed = "none" | "20" | "15" | "10" | "5" | "80" | "100";

export function bucketBatteryPct(pct: number): BatteryPctBucket {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (clamped <= 5) return "0_to_5";
  if (clamped <= 10) return "6_to_10";
  if (clamped <= 15) return "11_to_15";
  if (clamped <= 20) return "16_to_20";
  if (clamped <= 40) return "21_to_40";
  if (clamped <= 60) return "41_to_60";
  if (clamped <= 79) return "61_to_79";
  if (clamped === 80) return "80_limit";
  if (clamped <= 99) return "81_to_99";
  return "100";
}

export function getBatteryLevelBand(pct: number): BatteryLevelBand {
  if (pct < 0 || pct > 100 || Number.isNaN(pct)) return "unknown";
  if (pct <= 5) return "critical";
  if (pct <= 15) return "low";
  return "normal";
}

export function bucketHealthPct(healthPct: number): HealthPctBucket {
  if (healthPct < 0 || Number.isNaN(healthPct)) return "unknown";
  if (healthPct >= 90) return "90_to_100";
  if (healthPct >= 80) return "80_to_89";
  if (healthPct >= 70) return "70_to_79";
  return "lt_70";
}

export function bucketHours(hours: number | null): HoursBucket {
  if (hours === null || hours < 0) return "not_applicable";
  if (hours < 2) return "lt_2h";
  if (hours <= 5) return "2_to_5h";
  if (hours <= 10) return "6_to_10h";
  if (hours <= 20) return "11_to_20h";
  if (hours <= 40) return "21_to_40h";
  return "gt_40h";
}

export function bucketEstimatedGainHours(hours: number): GainHoursBucket {
  if (hours <= 0) return "not_applicable";
  if (hours <= 3) return "1_to_3h";
  if (hours <= 8) return "4_to_8h";
  if (hours <= 15) return "9_to_15h";
  return "gt_15h";
}

export function bucketChargeMinsLeft(
  mins: number | null,
): ChargeMinsLeftBucket {
  if (mins === null || mins < 0) return "not_charging";
  if (mins < 15) return "lt_15m";
  if (mins <= 30) return "15_to_30m";
  if (mins <= 60) return "31_to_60m";
  return "gt_60m";
}

export function bucketSleepTimerMins(mins: number): SleepTimerMinsBucket {
  if (mins <= 0) return "none";
  if (mins <= 5) return "1_to_5m";
  if (mins <= 15) return "6_to_15m";
  if (mins <= 30) return "16_to_30m";
  return "gt_30m";
}

export function bucketDeviceCount(count: number): DeviceCountBucket {
  if (count <= 0) return "0";
  if (count === 1) return "1";
  if (count <= 3) return "2_3";
  return "4_plus";
}

export function bucketDurationMs(ms: number): string {
  if (ms < 1000) return "lt_1s";
  if (ms < 5000) return "1_to_5s";
  if (ms < 30000) return "5_to_30s";
  if (ms < 120000) return "30_to_120s";
  if (ms < 600000) return "2_to_10m";
  return "gt_10m";
}

export function bucketDurationSec(sec: number): string {
  if (sec < 60) return "lt_1m";
  if (sec < 300) return "1_to_5m";
  if (sec < 1800) return "5_to_30m";
  if (sec < 7200) return "30_to_120m";
  if (sec < 43200) return "2_to_12h";
  return "gt_12h";
}

export function bucketResponseTimeSec(sec: number): string {
  if (sec < 10) return "lt_10s";
  if (sec < 60) return "10s_to_60s";
  if (sec < 300) return "1m_to_5m";
  if (sec <= 600) return "5m_to_10m";
  return "gt_10m";
}

export function getConnectionDrainFactor(
  connectionType: ConnectionType,
): number {
  switch (connectionType) {
    case "bluetooth":
      return 1.15; // BLE generally draws less radio power -> longer life
    case "usb_dongle_2_4ghz":
      return 1.0; // baseline high-polling 2.4GHz dongle
    case "wired_usb":
      return 1.0;
    default:
      return 1.0;
  }
}

export interface PredictiveEstimate {
  gamingHours: number;
  officeHours: number;
  chargeMinsLeft: number | null;
  rgbSavingsHours: number;
  sleepSavingsHours: number;
}

export function computePredictiveEstimate(
  device: PeripheralDevice,
): PredictiveEstimate {
  const pctRatio = Math.max(0, Math.min(100, device.batteryPct)) / 100;
  const healthRatio = Math.max(0.5, Math.min(1, device.healthPct / 100));
  const transportFactor = getConnectionDrainFactor(device.connectionType);

  // Polling rate drain penalty for mouse/keyboard on 2.4GHz
  const pollingPenalty =
    device.pollingRateHz === 4000
      ? 0.55
      : device.pollingRateHz === 1000
        ? 1.0
        : device.pollingRateHz === 500
          ? 1.12
          : 1.25;

  const sleepBonusRatio =
    device.sleepTimerMins > 0
      ? 1 +
        Math.min(
          0.18,
          (35 - Math.min(30, device.sleepTimerMins)) * 0.004 + 0.06,
        )
      : 1.0;

  // Base predictive hours calibrated so a 72% wireless mouse shows ~8h gaming / 24h office by default
  const rgbBonusGaming =
    device.rgbOff && device.supportsRgbControl
      ? Math.round(device.rgbEcoGainHours * 0.45)
      : 0;
  const rgbBonusOffice =
    device.rgbOff && device.supportsRgbControl ? device.rgbEcoGainHours : 0;

  const rawGaming =
    device.baseGamingHoursAt100 *
      pctRatio *
      healthRatio *
      transportFactor *
      pollingPenalty *
      sleepBonusRatio +
    rgbBonusGaming * pctRatio;
  const rawOffice =
    device.baseOfficeHoursAt100 *
      pctRatio *
      healthRatio *
      transportFactor *
      sleepBonusRatio +
    rgbBonusOffice * pctRatio;

  const gamingHours = Math.max(0, Math.round(rawGaming));
  const officeHours = Math.max(0, Math.round(rawOffice));

  const sleepSavingsHours =
    device.sleepTimerMins > 0
      ? Math.max(1, Math.round(rawOffice * (sleepBonusRatio - 1)))
      : 0;

  let chargeMinsLeft: number | null = null;
  if (device.chargingState === "charging") {
    const targetPct =
      device.chargeLimit80Enabled && !device.chargeLimitOverrideOnce ? 80 : 100;
    const remainingPct = Math.max(0, targetPct - device.batteryPct);
    // Roughly ~0.9 min per 1% fast-charge curve -> 28% = 25 min left (matches 72% -> 25 min left!)
    chargeMinsLeft = Math.max(1, Math.round(remainingPct * 0.9));
  }

  return {
    gamingHours,
    officeHours,
    chargeMinsLeft,
    rgbSavingsHours: device.supportsRgbControl ? device.rgbEcoGainHours : 0,
    sleepSavingsHours,
  };
}

/**
 * Returns the most urgent threshold crossed between prevPct and nextPct.
 * Urgent priority order for downward crossings: 5 -> 10 -> 15 -> 20.
 * Upward crossings: 80 -> 100.
 */
export function detectThresholdCrossed(
  prevPct: number,
  nextPct: number,
): ThresholdCrossed {
  if (prevPct === nextPct) return "none";

  if (nextPct < prevPct) {
    const downThresholds: Array<{ value: number; label: ThresholdCrossed }> = [
      { value: 5, label: "5" },
      { value: 10, label: "10" },
      { value: 15, label: "15" },
      { value: 20, label: "20" },
    ];
    for (const t of downThresholds) {
      if (prevPct > t.value && nextPct <= t.value) {
        return t.label;
      }
    }
  } else {
    if (prevPct < 100 && nextPct >= 100) return "100";
    if (prevPct < 80 && nextPct >= 80) return "80";
  }

  return "none";
}
