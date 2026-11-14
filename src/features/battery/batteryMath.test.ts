import test from "node:test";
import assert from "node:assert/strict";
import {
  bucketBatteryPct,
  bucketChargeMinsLeft,
  bucketDeviceCount,
  bucketHours,
  bucketSleepTimerMins,
  computePredictiveEstimate,
  detectThresholdCrossed,
  getBatteryLevelBand,
} from "./batteryMath";
import { INITIAL_DEVICES } from "../../shared/defaults";

test("battery percentage bucketing matches tracking plan boundaries", () => {
  assert.equal(bucketBatteryPct(0), "0_to_5");
  assert.equal(bucketBatteryPct(5), "0_to_5");
  assert.equal(bucketBatteryPct(15), "11_to_15");
  assert.equal(bucketBatteryPct(72), "61_to_79");
  assert.equal(bucketBatteryPct(80), "80_limit");
  assert.equal(bucketBatteryPct(81), "81_to_99");
  assert.equal(bucketBatteryPct(100), "100");
});

test("battery level band keeps charging state and band separate", () => {
  assert.equal(getBatteryLevelBand(72), "normal");
  assert.equal(getBatteryLevelBand(15), "low");
  assert.equal(getBatteryLevelBand(6), "low");
  assert.equal(getBatteryLevelBand(5), "critical");
  assert.equal(getBatteryLevelBand(0), "critical");
});

test("threshold crossed returns most urgent threshold when jumping multiple boundaries", () => {
  assert.equal(detectThresholdCrossed(78, 65), "none");
  assert.equal(detectThresholdCrossed(22, 18), "20");
  assert.equal(detectThresholdCrossed(22, 4), "5");
  assert.equal(detectThresholdCrossed(16, 12), "15");
  assert.equal(detectThresholdCrossed(75, 80), "80");
  assert.equal(detectThresholdCrossed(95, 100), "100");
});

test("predictive lifespan computes gaming/office hours and RGB savings", () => {
  const mouse = INITIAL_DEVICES[0];
  const baseEst = computePredictiveEstimate(mouse);
  assert.ok(baseEst.gamingHours >= 6 && baseEst.gamingHours <= 10);
  assert.ok(baseEst.officeHours >= 20 && baseEst.officeHours <= 28);
  assert.equal(
    baseEst.chargeMinsLeft !== null && baseEst.chargeMinsLeft > 0,
    true,
  );

  const rgbOffMouse = { ...mouse, rgbOff: true };
  const ecoEst = computePredictiveEstimate(rgbOffMouse);
  assert.ok(ecoEst.officeHours > baseEst.officeHours);
  assert.ok(ecoEst.gamingHours > baseEst.gamingHours);
});

test("auxiliary buckets map correctly", () => {
  assert.equal(bucketHours(8), "6_to_10h");
  assert.equal(bucketHours(24), "21_to_40h");
  assert.equal(bucketChargeMinsLeft(25), "15_to_30m");
  assert.equal(bucketChargeMinsLeft(null), "not_charging");
  assert.equal(bucketSleepTimerMins(0), "none");
  assert.equal(bucketSleepTimerMins(15), "6_to_15m");
  assert.equal(bucketDeviceCount(3), "2_3");
  assert.equal(bucketDeviceCount(4), "4_plus");
});
