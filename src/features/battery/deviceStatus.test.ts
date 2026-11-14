import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_DEVICES, INITIAL_SETTINGS } from "../../shared/defaults";
import {
  deviceSubtitle,
  evaluateLowBattery,
  hasBatteryReading,
} from "./deviceStatus";

test("threshold, identity, recharge hysteresis and notification settings", () => {
  const alerted = new Set<string>();
  const settings = {
    ...INITIAL_SETTINGS,
    notificationsEnabled: true,
    dndEnabled: false,
    isFullscreenActive: false,
    lowBatteryThresholdPct: 20 as const,
  };
  const device = {
    ...INITIAL_DEVICES[0],
    deviceId: "test-headset",
    connected: true,
    batteryAvailable: true,
    batteryPct: 19,
    chargingState: "discharging" as const,
  };
  assert.equal(
    evaluateLowBattery(
      [device],
      { ...settings, notificationsEnabled: false },
      alerted,
    ).length,
    0,
  );
  assert.equal(evaluateLowBattery([device], settings, alerted).length, 1);
  assert.equal(
    evaluateLowBattery([{ ...device, slotId: "slot_8" }], settings, alerted)
      .length,
    0,
  );
  evaluateLowBattery([{ ...device, batteryPct: 23 }], settings, alerted);
  assert.equal(evaluateLowBattery([device], settings, alerted).length, 0);
  evaluateLowBattery([{ ...device, batteryPct: 26 }], settings, alerted);
  assert.equal(
    evaluateLowBattery([device], { ...settings, dndEnabled: true }, alerted)
      .length,
    0,
  );
  assert.equal(evaluateLowBattery([device], settings, alerted).length, 1);
});

test("missing and disconnected readings are not zero; no synthetic runtime estimate", () => {
  const device = {
    ...INITIAL_DEVICES[0],
    connected: true,
    batteryPct: 0,
    batteryAvailable: true,
  };
  assert.equal(hasBatteryReading(device), true);
  assert.equal(
    hasBatteryReading({ ...device, batteryAvailable: false }),
    false,
  );
  assert.equal(hasBatteryReading({ ...device, connected: false }), false);
  assert.equal(hasBatteryReading({ ...device, batteryPct: NaN }), false);
  assert.equal(
    deviceSubtitle({ ...device, chargingState: "discharging" }, "en"),
    "On battery",
  );
});
