import test from "node:test";
import assert from "node:assert/strict";
import {
  applySuggestion,
  createInitialAnalyticsState,
  emitBatteryStateTransition,
  emitDeviceConnected,
  emitErrorOncePerSession,
  emitEvent,
  evaluateAlertDecision,
  grantAnalyticsConsent,
  registerSuggestionShown,
  resetAnalyticsId,
  resolveAlertActioned,
  revertSuggestionIfActive,
  revokeAnalyticsConsent,
  validatePayloadSafety,
} from "./analyticsEngine";
import { INITIAL_DEVICES, INITIAL_SETTINGS } from "../../shared/defaults";

test("strict pre-consent silence: zero events emitted or buffered before consent", () => {
  const s0 = createInitialAnalyticsState(1_700_000_000_000);
  assert.equal(s0.consented, false);
  assert.equal(s0.installId, null);

  const r1 = emitEvent(s0, INITIAL_SETTINGS, "widget_opened", {
    open_trigger: "tray_icon_click",
  });
  assert.equal(r1.emitted, null);
  assert.equal(r1.nextState.events.length, 0);
});

test("consent ordering emits telemetry_consent_granted, app_installed, app_launched in order", () => {
  const s0 = createInitialAnalyticsState(1_700_000_000_000);
  const s1 = grantAnalyticsConsent(
    s0,
    INITIAL_SETTINGS,
    "first_run_modal",
    3,
    1_700_000_001_000,
  );

  assert.equal(s1.consented, true);
  assert.ok(s1.installId);
  const chronological = [...s1.events].reverse().map((e) => e.event);
  assert.deepEqual(chronological, [
    "telemetry_consent_granted",
    "app_installed",
    "app_launched",
  ]);
  for (const ev of s1.events) {
    assert.equal(ev.properties.$process_person_profile, false);
    assert.equal(ev.properties.$geoip_disable, true);
    assert.equal(validatePayloadSafety(ev).ok, true);
  }
});

test("re-opt-in emits is_reopt_in=true and never re-emits app_installed", () => {
  const s0 = createInitialAnalyticsState(1_700_000_000_000);
  const s1 = grantAnalyticsConsent(
    s0,
    INITIAL_SETTINGS,
    "first_run_modal",
    3,
    1_700_000_001_000,
  );
  const firstInstallId = s1.installId;
  const s2 = revokeAnalyticsConsent(s1);
  assert.equal(s2.consented, false);
  assert.equal(s2.installId, null);

  const s3 = grantAnalyticsConsent(
    s2,
    INITIAL_SETTINGS,
    "settings_toggle",
    3,
    1_700_000_010_000,
  );
  assert.notEqual(s3.installId, firstInstallId);
  const appInstalledEvents = s3.events.filter(
    (e) => e.event === "app_installed",
  );
  assert.equal(appInstalledEvents.length, 1);
  const latestConsent = s3.events.find(
    (e) => e.event === "telemetry_consent_granted",
  );
  assert.equal(latestConsent?.properties.is_reopt_in, true);
});

test("battery_state_changed ignores normal non-threshold ticks and captures threshold crossings", () => {
  const base = grantAnalyticsConsent(
    createInitialAnalyticsState(),
    INITIAL_SETTINGS,
    "first_run_modal",
    3,
  );
  const mouse = {
    ...INITIAL_DEVICES[0],
    batteryPct: 78,
    chargingState: "discharging" as const,
  };

  // 78 -> 65 crosses no threshold and keeps charging state discharging
  const afterNormalTick = emitBatteryStateTransition(
    base,
    INITIAL_SETTINGS,
    { ...mouse, batteryPct: 65 },
    78,
    "discharging",
  );
  assert.equal(
    afterNormalTick.events.filter((e) => e.event === "battery_state_changed")
      .length,
    0,
  );

  // 18 -> 14 crosses 15% threshold while still discharging
  const after15 = emitBatteryStateTransition(
    base,
    INITIAL_SETTINGS,
    { ...mouse, batteryPct: 14 },
    18,
    "discharging",
  );
  const transition = after15.events.find(
    (e) => e.event === "battery_state_changed",
  );
  assert.ok(transition);
  assert.equal(transition.properties.from_charging_state, "discharging");
  assert.equal(transition.properties.to_charging_state, "discharging");
  assert.equal(transition.properties.battery_level_band, "low");
  assert.equal(transition.properties.threshold_crossed, "15");
});

test("suggestion_id joins shown -> applied -> reverted", () => {
  const base = grantAnalyticsConsent(
    createInitialAnalyticsState(1000),
    INITIAL_SETTINGS,
    "first_run_modal",
    3,
    1000,
  );
  const kbd = INITIAL_DEVICES[1];

  const shown = registerSuggestionShown(
    base,
    INITIAL_SETTINGS,
    kbd,
    "turn_off_rgb",
    "tray_widget",
    12,
    2000,
  );
  const applied = applySuggestion(
    shown.nextState,
    INITIAL_SETTINGS,
    kbd,
    "turn_off_rgb",
    "tray_widget",
    12,
    undefined,
    3000,
  );
  const reverted = revertSuggestionIfActive(
    applied.nextState,
    INITIAL_SETTINGS,
    kbd,
    "turn_off_rgb",
    "tray_widget",
    5000,
  );

  const sEv = reverted.events.find(
    (e) => e.event === "power_saving_suggestion_shown",
  );
  const aEv = reverted.events.find(
    (e) => e.event === "power_saving_suggestion_applied",
  );
  const rEv = reverted.events.find(
    (e) => e.event === "power_saving_suggestion_reverted",
  );
  assert.ok(sEv && aEv && rEv);
  assert.equal(sEv.properties.suggestion_id, aEv.properties.suggestion_id);
  assert.equal(aEv.properties.suggestion_id, rEv.properties.suggestion_id);
  assert.equal(rEv.properties.reverted_to, "rgb_on");
});

test("single alert decision function emits shown OR suppressed, never both, and joins alert_id", () => {
  const base = grantAnalyticsConsent(
    createInitialAnalyticsState(1000),
    INITIAL_SETTINGS,
    "first_run_modal",
    3,
    1000,
  );
  const headset = INITIAL_DEVICES[2];

  const d1 = evaluateAlertDecision(
    base,
    INITIAL_SETTINGS,
    headset,
    "low_battery_15pct",
    undefined,
    2000,
  );
  assert.ok(d1.shownAlert);
  assert.equal(d1.suppressedReason, null);
  assert.equal(
    d1.nextState.events.filter((e) => e.event === "alert_shown").length,
    1,
  );
  assert.equal(
    d1.nextState.events.filter((e) => e.event === "alert_suppressed").length,
    0,
  );

  const afterAction = resolveAlertActioned(
    d1.nextState,
    INITIAL_SETTINGS,
    d1.shownAlert!,
    "mute_rgb_clicked",
    5000,
  );
  const shownEv = afterAction.events.find((e) => e.event === "alert_shown");
  const actionEv = afterAction.events.find((e) => e.event === "alert_actioned");
  assert.equal(shownEv?.properties.alert_id, actionEv?.properties.alert_id);

  // Fullscreen suppression
  const fsSettings = {
    ...INITIAL_SETTINGS,
    isFullscreenActive: true,
    fullscreenSuppressionEnabled: true,
  };
  const d2 = evaluateAlertDecision(
    base,
    fsSettings,
    headset,
    "low_battery_15pct",
    { ignoreCooldown: true },
    90000,
  );
  assert.equal(d2.shownAlert, null);
  assert.equal(d2.suppressedReason, "fullscreen_suppression_rule");
  assert.equal(
    d2.nextState.events.filter((e) => e.event === "alert_suppressed").length,
    1,
  );
  assert.equal(
    d2.nextState.events.filter((e) => e.event === "alert_shown").length,
    0,
  );
});

test("device_connected debounces within 30s and error_occurred caps 1 per code per session", () => {
  const base = grantAnalyticsConsent(
    createInitialAnalyticsState(1000),
    INITIAL_SETTINGS,
    "first_run_modal",
    3,
    1000,
  );
  const mouse = INITIAL_DEVICES[0];

  const c1 = emitDeviceConnected(
    base,
    INITIAL_SETTINGS,
    mouse,
    "auto_scan",
    true,
    2000,
  );
  const c2 = emitDeviceConnected(
    c1,
    INITIAL_SETTINGS,
    mouse,
    "reconnect",
    false,
    10_000,
  );
  assert.equal(
    c2.events.filter((e) => e.event === "device_connected").length,
    1,
  );

  const e1 = emitErrorOncePerSession(
    c2,
    INITIAL_SETTINGS,
    "udev_permission_denied",
    "device_io",
    mouse,
    true,
    12_000,
  );
  const e2 = emitErrorOncePerSession(
    e1,
    INITIAL_SETTINGS,
    "udev_permission_denied",
    "device_io",
    mouse,
    true,
    15_000,
  );
  assert.equal(e2.events.filter((e) => e.event === "error_occurred").length, 1);

  const reset = resetAnalyticsId(e2);
  assert.equal(reset.events.length, 0);
  assert.notEqual(reset.installId, base.installId);
});
