import {
  bucketBatteryPct,
  bucketChargeMinsLeft,
  bucketDeviceCount,
  bucketDurationMs,
  bucketEstimatedGainHours,
  bucketHealthPct,
  bucketHours,
  bucketResponseTimeSec,
  bucketSleepTimerMins,
  detectThresholdCrossed,
  getBatteryLevelBand,
  computePredictiveEstimate,
} from "../battery/batteryMath.ts";
import type {
  ActiveAlert,
  ActiveSuggestionRecord,
  AlertActionTaken,
  AlertType,
  AppSettings,
  ChargingState,
  DeliveryMode,
  DismissMethod,
  P0EventName,
  PeripheralDevice,
  PermissionStatus,
  PermissionType,
  SuggestionSurface,
  SuggestionType,
  SuppressionReason,
  TelemetryEnvelopeEvent,
} from "../../shared/types";

export function createUuid(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const FORBIDDEN_KEYS = new Set([
  "email",
  "ip",
  "$ip",
  "mac",
  "mac_address",
  "serial",
  "serial_number",
  "vid",
  "pid",
  "usb_vid_pid",
  "device_name",
  "raw_device_name",
  "window_title",
  "process_name",
  "game_name",
  "file_path",
  "username",
]);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const PATH_RE = /([A-Za-z]:\\|\/home\/|\/Users\/)/;

export function validatePayloadSafety(event: TelemetryEnvelopeEvent): {
  ok: boolean;
  reason?: string;
} {
  if (event.properties.$process_person_profile !== false) {
    return { ok: false, reason: "$process_person_profile must be false" };
  }
  if (event.properties.$geoip_disable !== true) {
    return { ok: false, reason: "$geoip_disable must be true" };
  }
  for (const [key, val] of Object.entries(event.properties)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return { ok: false, reason: `Forbidden property key: ${key}` };
    }
    if (typeof val === "string") {
      if (EMAIL_RE.test(val))
        return { ok: false, reason: `Email pattern in ${key}` };
      if (MAC_RE.test(val))
        return { ok: false, reason: `MAC pattern in ${key}` };
      if (PATH_RE.test(val))
        return { ok: false, reason: `File path pattern in ${key}` };
    }
  }
  return { ok: true };
}

export function computeInstallAgeBucket(
  firstSeenMs: number | null,
  nowMs: number,
): "0" | "1_to_7" | "8_to_30" | "31_plus" | "unknown" {
  if (firstSeenMs === null || firstSeenMs > nowMs) return "unknown";
  const days = Math.floor((nowMs - firstSeenMs) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "0";
  if (days <= 7) return "1_to_7";
  if (days <= 30) return "8_to_30";
  return "31_plus";
}

export interface AnalyticsState {
  consented: boolean;
  installId: string | null;
  sessionId: string;
  firstSeenTimestampMs: number;
  hasEmittedAppInstalled: boolean;
  hasEverConsentedBefore: boolean;
  appVersion: string;
  buildChannel: "release" | "beta" | "dev";
  installSource:
    | "website"
    | "github"
    | "microsoft_store"
    | "winget"
    | "aur"
    | "flatpak"
    | "snap"
    | "apt"
    | "appimage"
    | "other"
    | "unknown";
  consentSchemaVersion: string;
  events: TelemetryEnvelopeEvent[];
  lastDeviceConnectMs: Record<string, number>;
  lastAlertByKeyMs: Record<string, number>;
  emittedPermissionsSession: Record<string, PermissionStatus>;
  emittedErrorCodesSession: Set<string>;
  suggestionsById: Record<string, ActiveSuggestionRecord>;
}

export function createInitialAnalyticsState(
  nowMs = Date.now(),
): AnalyticsState {
  return {
    consented: false,
    installId: null,
    sessionId: createUuid(),
    firstSeenTimestampMs: nowMs,
    hasEmittedAppInstalled: false,
    hasEverConsentedBefore: false,
    appVersion: "1.0.0",
    buildChannel: "release",
    installSource: "website",
    consentSchemaVersion: "v1",
    events: [],
    lastDeviceConnectMs: {},
    lastAlertByKeyMs: {},
    emittedPermissionsSession: {},
    emittedErrorCodesSession: new Set(),
    suggestionsById: {},
  };
}

function buildSuperProperties(
  state: AnalyticsState,
  settings: AppSettings,
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {
    $process_person_profile: false,
    $geoip_disable: true,
    install_id: state.installId ?? "",
    session_id: state.sessionId,
    app_version: state.appVersion,
    build_channel: state.buildChannel,
    os: settings.os,
    os_version_bucket: settings.osVersionBucket,
    arch: "x64",
    locale: settings.locale,
    display_server: settings.displayServer,
    install_source: state.installSource,
    first_app_version: state.appVersion,
    consent_version: state.consentSchemaVersion,
  };
  if (settings.os === "linux") {
    props.distro = settings.distro;
  }
  return props;
}

export function emitEvent(
  state: AnalyticsState,
  settings: AppSettings,
  eventName: P0EventName,
  properties: Record<string, string | number | boolean>,
  nowMs = Date.now(),
): { nextState: AnalyticsState; emitted: TelemetryEnvelopeEvent | null } {
  if (!state.consented || !state.installId) {
    return { nextState: state, emitted: null };
  }

  const envelope: TelemetryEnvelopeEvent = {
    event: eventName,
    distinct_id: state.installId,
    uuid: createUuid(),
    timestamp: new Date(nowMs).toISOString(),
    properties: {
      ...buildSuperProperties(state, settings),
      ...properties,
    },
  };

  const safety = validatePayloadSafety(envelope);
  if (!safety.ok) {
    return { nextState: state, emitted: null };
  }

  return {
    nextState: {
      ...state,
      events: [envelope, ...state.events].slice(0, 200),
    },
    emitted: envelope,
  };
}

export function grantAnalyticsConsent(
  state: AnalyticsState,
  settings: AppSettings,
  surface: "first_run_modal" | "settings_toggle",
  connectedDeviceCount: number,
  nowMs = Date.now(),
): AnalyticsState {
  if (state.consented && state.installId) return state;

  const isReoptIn = state.hasEverConsentedBefore;
  const ageBucket = computeInstallAgeBucket(state.firstSeenTimestampMs, nowMs);
  const newInstallId = createUuid();

  let current: AnalyticsState = {
    ...state,
    consented: true,
    installId: newInstallId,
    hasEverConsentedBefore: true,
  };

  current = emitEvent(
    current,
    settings,
    "telemetry_consent_granted",
    {
      consent_surface: surface,
      consent_schema_version: state.consentSchemaVersion,
      is_reopt_in: isReoptIn,
      install_age_days_bucket: ageBucket,
    },
    nowMs,
  ).nextState;

  if (!current.hasEmittedAppInstalled && !isReoptIn) {
    current = emitEvent(
      current,
      settings,
      "app_installed",
      {
        install_source: current.installSource,
        install_age_days_bucket: ageBucket,
        utm_source: "direct",
        utm_medium: "other",
        utm_campaign: "other",
      },
      nowMs + 1,
    ).nextState;
    current = { ...current, hasEmittedAppInstalled: true };
  }

  current = emitEvent(
    current,
    settings,
    "app_launched",
    {
      launch_trigger:
        surface === "first_run_modal" ? "installer" : "user_manual",
      device_count_bucket: bucketDeviceCount(connectedDeviceCount),
      start_minimized: false,
    },
    nowMs + 2,
  ).nextState;

  return current;
}

export function revokeAnalyticsConsent(state: AnalyticsState): AnalyticsState {
  return {
    ...state,
    consented: false,
    installId: null,
    lastDeviceConnectMs: {},
    lastAlertByKeyMs: {},
  };
}

export function resetAnalyticsId(state: AnalyticsState): AnalyticsState {
  if (!state.consented) {
    return { ...state, installId: null, events: [] };
  }
  return {
    ...state,
    installId: createUuid(),
    sessionId: createUuid(),
    events: [],
    suggestionsById: {},
  };
}

export function emitDeviceConnected(
  state: AnalyticsState,
  settings: AppSettings,
  device: PeripheralDevice,
  source: "auto_scan" | "manual_add" | "reconnect",
  isFirstDevice: boolean,
  nowMs = Date.now(),
): AnalyticsState {
  const prevConnect = state.lastDeviceConnectMs[device.slotId];
  if (prevConnect !== undefined && nowMs - prevConnect < 30_000) {
    return state;
  }

  const next = emitEvent(
    state,
    settings,
    "device_connected",
    {
      device_slot_id: device.slotId,
      device_type: device.type,
      connection_type: device.connectionType,
      source,
      is_first_device: isFirstDevice,
      is_reconnect: source === "reconnect",
      battery_pct_bucket: bucketBatteryPct(device.batteryPct),
      is_charging: device.chargingState === "charging",
      supports_rgb_control: device.supportsRgbControl,
      supports_sleep_timer: device.supportsSleepTimer,
      supports_charge_limit: device.supportsChargeLimit,
      supports_health: device.supportsHealth,
      protocol_driver: device.protocolDriver,
    },
    nowMs,
  ).nextState;

  return {
    ...next,
    lastDeviceConnectMs: {
      ...next.lastDeviceConnectMs,
      [device.slotId]: nowMs,
    },
  };
}

export function emitBatteryStateTransition(
  state: AnalyticsState,
  settings: AppSettings,
  device: PeripheralDevice,
  prevPct: number,
  prevChargingState: ChargingState,
  nowMs = Date.now(),
): AnalyticsState {
  const thresholdCrossed = detectThresholdCrossed(prevPct, device.batteryPct);
  const chargingChanged = prevChargingState !== device.chargingState;

  // Strictly never emit on non-threshold polling ticks
  if (!chargingChanged && thresholdCrossed === "none") {
    return state;
  }

  const estimate = computePredictiveEstimate(device);
  const band = getBatteryLevelBand(device.batteryPct);

  return emitEvent(
    state,
    settings,
    "battery_state_changed",
    {
      device_slot_id: device.slotId,
      device_type: device.type,
      connection_type: device.connectionType,
      from_charging_state: prevChargingState,
      to_charging_state: device.chargingState,
      battery_level_band: band,
      threshold_crossed: thresholdCrossed,
      battery_pct_bucket: bucketBatteryPct(device.batteryPct),
      est_gaming_hours_bucket: bucketHours(estimate.gamingHours),
      est_office_hours_bucket: bucketHours(estimate.officeHours),
      est_charge_mins_left_bucket: bucketChargeMinsLeft(
        estimate.chargeMinsLeft,
      ),
    },
    nowMs,
  ).nextState;
}

export function registerSuggestionShown(
  state: AnalyticsState,
  settings: AppSettings,
  device: PeripheralDevice,
  suggestionType: SuggestionType,
  surface: SuggestionSurface,
  gainHours: number,
  nowMs = Date.now(),
): { nextState: AnalyticsState; suggestionId: string } {
  const existing = Object.values(state.suggestionsById).find(
    (s) =>
      s.slotId === device.slotId &&
      s.suggestionType === suggestionType &&
      !s.revertedAtMs &&
      nowMs - s.shownAtMs < 7 * 86_400_000,
  );
  if (existing) {
    return { nextState: state, suggestionId: existing.suggestionId };
  }

  const suggestionId = createUuid();
  const record: ActiveSuggestionRecord = {
    suggestionId,
    suggestionType,
    slotId: device.slotId,
    deviceType: device.type,
    surface,
    estimatedGainHours: gainHours,
    shownAtMs: nowMs,
  };

  const res = emitEvent(
    {
      ...state,
      suggestionsById: {
        ...state.suggestionsById,
        [suggestionId]: record,
      },
    },
    settings,
    "power_saving_suggestion_shown",
    {
      suggestion_id: suggestionId,
      suggestion_type: suggestionType,
      device_type: device.type,
      battery_pct_bucket: bucketBatteryPct(device.batteryPct),
      estimated_gain_hours_bucket: bucketEstimatedGainHours(gainHours),
      surface,
    },
    nowMs,
  );

  return { nextState: res.nextState, suggestionId };
}

export function applySuggestion(
  state: AnalyticsState,
  settings: AppSettings,
  device: PeripheralDevice,
  suggestionType: SuggestionType,
  surface: SuggestionSurface,
  gainHours: number,
  options?: {
    alertId?: string;
    sleepTimerMins?: number;
    source?: "suggestion" | "manual" | "auto";
  },
  nowMs = Date.now(),
): { nextState: AnalyticsState; suggestionId: string } {
  const source = options?.source ?? "suggestion";
  let workingState = state;
  let suggestionId = "";

  if (source === "suggestion") {
    const existing = Object.values(state.suggestionsById).find(
      (s) =>
        s.slotId === device.slotId &&
        s.suggestionType === suggestionType &&
        !s.appliedAtMs,
    );
    if (existing) {
      suggestionId = existing.suggestionId;
    } else {
      const shown = registerSuggestionShown(
        workingState,
        settings,
        device,
        suggestionType,
        surface,
        gainHours,
        nowMs,
      );
      workingState = shown.nextState;
      suggestionId = shown.suggestionId;
    }
    const currentRec = workingState.suggestionsById[suggestionId];
    if (currentRec) {
      workingState = {
        ...workingState,
        suggestionsById: {
          ...workingState.suggestionsById,
          [suggestionId]: { ...currentRec, appliedAtMs: nowMs },
        },
      };
    }
  }

  const props: Record<string, string | number | boolean> = {
    suggestion_type: suggestionType,
    action_type: suggestionType,
    device_type: device.type,
    source,
    estimated_gain_hours_bucket: bucketEstimatedGainHours(gainHours),
    surface,
  };
  if (suggestionId) props.suggestion_id = suggestionId;
  if (options?.alertId) props.alert_id = options.alertId;
  if (
    suggestionType === "enable_sleep_timer" &&
    options?.sleepTimerMins !== undefined
  ) {
    props.sleep_timer_mins_bucket = bucketSleepTimerMins(
      options.sleepTimerMins,
    );
  }

  const res = emitEvent(
    workingState,
    settings,
    "power_saving_suggestion_applied",
    props,
    nowMs + 1,
  );
  return { nextState: res.nextState, suggestionId };
}

export function revertSuggestionIfActive(
  state: AnalyticsState,
  settings: AppSettings,
  device: PeripheralDevice,
  suggestionType: SuggestionType,
  revertSurface: "tray_widget" | "settings_window" | "hardware_button_sync",
  nowMs = Date.now(),
): AnalyticsState {
  const active = Object.values(state.suggestionsById).find(
    (s) =>
      s.slotId === device.slotId &&
      s.suggestionType === suggestionType &&
      s.appliedAtMs !== undefined &&
      s.revertedAtMs === undefined &&
      nowMs - s.appliedAtMs <= 7 * 86_400_000,
  );

  const revertedToMap: Record<SuggestionType, string> = {
    turn_off_rgb: "rgb_on",
    dim_rgb_50pct: "rgb_on",
    enable_sleep_timer: "timer_cancelled",
    lower_polling_rate: "polling_restored",
    lower_brightness: "brightness_restored",
  };

  let timeSinceBucket = "lt_10m";
  if (active?.appliedAtMs !== undefined) {
    const diffSec = Math.max(0, (nowMs - active.appliedAtMs) / 1000);
    if (diffSec < 600) timeSinceBucket = "lt_10m";
    else if (diffSec < 3600) timeSinceBucket = "10m_to_1h";
    else if (diffSec < 86400) timeSinceBucket = "1h_to_24h";
    else timeSinceBucket = "1d_to_7d";
  }

  const props: Record<string, string | number | boolean> = {
    suggestion_type: suggestionType,
    action_type: suggestionType,
    reverted_to: revertedToMap[suggestionType],
    device_type: device.type,
    source: active ? "suggestion" : "manual",
    revert_surface: revertSurface,
    time_since_applied_bucket: timeSinceBucket,
    battery_pct_bucket: bucketBatteryPct(device.batteryPct),
  };
  if (active) {
    props.suggestion_id = active.suggestionId;
  }

  let next = emitEvent(
    state,
    settings,
    "power_saving_suggestion_reverted",
    props,
    nowMs,
  ).nextState;

  if (active) {
    next = {
      ...next,
      suggestionsById: {
        ...next.suggestionsById,
        [active.suggestionId]: { ...active, revertedAtMs: nowMs },
      },
    };
  }

  return next;
}

/**
 * Single alert decision function: emits EITHER alert_shown OR alert_suppressed (never both).
 */
export function evaluateAlertDecision(
  state: AnalyticsState,
  settings: AppSettings,
  device: PeripheralDevice,
  alertType: AlertType,
  options?: { ignoreCooldown?: boolean },
  nowMs = Date.now(),
): {
  nextState: AnalyticsState;
  shownAlert: ActiveAlert | null;
  suppressedReason: SuppressionReason | null;
} {
  const alertId = createUuid();
  const cooldownKey = `${device.slotId}:${alertType}`;
  const lastMs = state.lastAlertByKeyMs[cooldownKey];
  const inCooldown =
    !options?.ignoreCooldown && lastMs !== undefined && nowMs - lastMs < 60_000;

  let suppressionReason: SuppressionReason | null = null;
  let deliveryMode: DeliveryMode = "os_native_toast";

  if (settings.dndEnabled) {
    suppressionReason = "user_dnd_enabled";
  } else if (
    !settings.notificationsEnabled &&
    !(settings.isFullscreenActive && settings.inGameOverlayEnabled)
  ) {
    suppressionReason = "disabled";
  } else if (settings.isFullscreenActive) {
    if (settings.fullscreenSuppressionEnabled) {
      suppressionReason = "fullscreen_suppression_rule";
    } else if (settings.inGameOverlayEnabled) {
      deliveryMode = "in_game_focus_overlay";
    } else {
      suppressionReason = "fullscreen_suppression_rule";
    }
  } else if (settings.notificationPermissionStatus === "denied") {
    suppressionReason = "os_notifications_blocked";
  } else if (inCooldown) {
    suppressionReason = "cooldown_active";
  } else if (
    settings.os === "linux" &&
    settings.displayServer === "wayland" &&
    settings.overlayPermissionStatus === "denied"
  ) {
    deliveryMode = "os_native_toast";
  } else if (
    alertType === "low_battery_15pct" ||
    alertType === "critical_battery_5pct"
  ) {
    deliveryMode = settings.inGameOverlayEnabled
      ? "in_game_focus_overlay"
      : "os_native_toast";
  }

  if (suppressionReason) {
    const nextState = emitEvent(
      state,
      settings,
      "alert_suppressed",
      {
        alert_id: alertId,
        alert_type: alertType,
        device_type: device.type,
        suppression_reason: suppressionReason,
        is_fullscreen: settings.isFullscreenActive,
        battery_pct_bucket: bucketBatteryPct(device.batteryPct),
      },
      nowMs,
    ).nextState;

    return { nextState, shownAlert: null, suppressedReason: suppressionReason };
  }

  const res = emitEvent(
    state,
    settings,
    "alert_shown",
    {
      alert_id: alertId,
      alert_type: alertType,
      device_type: device.type,
      battery_pct_bucket: bucketBatteryPct(device.batteryPct),
      connection_type: device.connectionType,
      delivery_mode: deliveryMode,
      is_fullscreen: settings.isFullscreenActive,
    },
    nowMs,
  );

  const shownAlert: ActiveAlert = {
    alertId,
    alertType,
    slotId: device.slotId,
    deviceType: device.type,
    connectionType: device.connectionType,
    batteryPct: device.batteryPct,
    deliveryMode,
    isFullscreen: settings.isFullscreenActive,
    createdAtMs: nowMs,
  };

  return {
    nextState: {
      ...res.nextState,
      lastAlertByKeyMs: {
        ...res.nextState.lastAlertByKeyMs,
        [cooldownKey]: nowMs,
      },
    },
    shownAlert,
    suppressedReason: null,
  };
}

export function resolveAlertActioned(
  state: AnalyticsState,
  settings: AppSettings,
  alert: ActiveAlert,
  actionTaken: AlertActionTaken,
  nowMs = Date.now(),
): AnalyticsState {
  const responseSec = Math.max(0, (nowMs - alert.createdAtMs) / 1000);
  return emitEvent(
    state,
    settings,
    "alert_actioned",
    {
      alert_id: alert.alertId,
      alert_type: alert.alertType,
      action_taken: actionTaken,
      response_time_sec_bucket: bucketResponseTimeSec(responseSec),
      device_type: alert.deviceType,
    },
    nowMs,
  ).nextState;
}

export function resolveAlertDismissed(
  state: AnalyticsState,
  settings: AppSettings,
  alert: ActiveAlert,
  dismissMethod: DismissMethod,
  nowMs = Date.now(),
): AnalyticsState {
  const responseSec = Math.max(0, (nowMs - alert.createdAtMs) / 1000);
  return emitEvent(
    state,
    settings,
    "alert_dismissed",
    {
      alert_id: alert.alertId,
      alert_type: alert.alertType,
      dismiss_method: dismissMethod,
      response_time_sec_bucket:
        dismissMethod === "timeout"
          ? "5m_to_10m"
          : bucketResponseTimeSec(responseSec),
      device_type: alert.deviceType,
    },
    nowMs,
  ).nextState;
}

export function emitPermissionResultOnce(
  state: AnalyticsState,
  settings: AppSettings,
  permissionType: PermissionType,
  permissionStatus: PermissionStatus,
  nowMs = Date.now(),
): AnalyticsState {
  if (state.emittedPermissionsSession[permissionType] === permissionStatus) {
    return state;
  }
  const next = emitEvent(
    state,
    settings,
    "permission_result",
    {
      permission_type: permissionType,
      permission_status: permissionStatus,
      display_server: settings.displayServer,
      os: settings.os,
    },
    nowMs,
  ).nextState;

  return {
    ...next,
    emittedPermissionsSession: {
      ...next.emittedPermissionsSession,
      [permissionType]: permissionStatus,
    },
  };
}

export function emitErrorOncePerSession(
  state: AnalyticsState,
  settings: AppSettings,
  errorCode:
    | "udev_permission_denied"
    | "hid_read_timeout"
    | "bluetooth_gatt_unreachable"
    | "rgb_control_unsupported"
    | "overlay_render_failed"
    | "updater_download_failed"
    | "device_scan_failed"
    | "tray_init_failed"
    | "analytics_flush_failed",
  subsystem:
    | "device_io"
    | "overlay_ui"
    | "power_control"
    | "auto_updater"
    | "analytics"
    | "tray"
    | "ui",
  device?: PeripheralDevice,
  isRecoverable = true,
  nowMs = Date.now(),
): AnalyticsState {
  if (state.emittedErrorCodesSession.has(errorCode)) {
    return state;
  }
  const props: Record<string, string | number | boolean> = {
    error_code: errorCode,
    subsystem,
    is_recoverable: isRecoverable,
  };
  if (device) {
    props.device_type = device.type;
    props.connection_type = device.connectionType;
  }
  const next = emitEvent(
    state,
    settings,
    "error_occurred",
    props,
    nowMs,
  ).nextState;
  const nextSet = new Set(next.emittedErrorCodesSession);
  nextSet.add(errorCode);
  return {
    ...next,
    emittedErrorCodesSession: nextSet,
  };
}

export function emitOnboardingStep(
  state: AnalyticsState,
  settings: AppSettings,
  stepNumber: number,
  stepName: "welcome" | "device_scan" | "notifications" | "startup" | "done",
  durationMs: number,
  nowMs = Date.now(),
): AnalyticsState {
  return emitEvent(
    state,
    settings,
    "onboarding_step_completed",
    {
      step_number: stepNumber,
      step_name: stepName,
      duration_ms_bucket: bucketDurationMs(durationMs),
    },
    nowMs,
  ).nextState;
}
