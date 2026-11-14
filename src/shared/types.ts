export type Locale = "en" | "mn";

export type OsPlatform = "windows" | "linux";
export type OsVersionBucket =
  | "win_10"
  | "win_11"
  | "linux_kernel_6_x"
  | "linux_kernel_5_x"
  | "other";
export type DisplayServer = "win32" | "wayland" | "x11" | "unknown";
export type LinuxDistro =
  | "arch"
  | "debian_ubuntu"
  | "fedora_rhel"
  | "opensuse"
  | "nixos"
  | "other";

export type DeviceType =
  | "laptop"
  | "mouse"
  | "keyboard"
  | "headset"
  | "controller"
  | "other"
  | "unknown";
export type ConnectionType =
  | "wired_usb"
  | "bluetooth"
  | "usb_dongle_2_4ghz"
  | "unknown";
export type ChargingState =
  | "charging"
  | "discharging"
  | "full"
  | "paused_limit"
  | "unknown";
export type BatteryLevelBand = "normal" | "low" | "critical" | "unknown";
export type ProtocolDriver =
  | "hidpp"
  | "razer_openrazer"
  | "steelseries_hid"
  | "standard_ble_bas"
  | "upower_generic"
  | "other";

export type WorkloadProfile = "gaming" | "office" | "auto_detect";

export interface PeripheralDevice {
  /** Provider identity, independent of display order. */
  deviceId?: string;
  batterySource?: string;
  connectionTypes?: ConnectionType[];
  batteryComponents?: {
    id: "left" | "right" | "case" | "headphone";
    batteryPct: number;
    charging: boolean;
  }[];
  slotId:
    | "slot_1"
    | "slot_2"
    | "slot_3"
    | "slot_4"
    | "slot_5"
    | "slot_6"
    | "slot_7"
    | "slot_8";
  type: DeviceType;
  labelEn: string;
  labelMn: string;
  batteryPct: number;
  batteryAvailable?: boolean;
  chargingState: ChargingState;
  connectionType: ConnectionType;
  connected: boolean;
  healthPct: number;
  rgbOff: boolean;
  rgbEcoGainHours: number;
  sleepTimerMins: number;
  chargeLimit80Enabled: boolean;
  chargeLimitOverrideOnce: boolean;
  pollingRateHz: 125 | 500 | 1000 | 4000;
  dpi: number;
  micMuted: boolean;
  supportsRgbControl: boolean;
  supportsSleepTimer: boolean;
  supportsChargeLimit: boolean;
  supportsHealth: boolean;
  protocolDriver: ProtocolDriver;
  workloadProfile: WorkloadProfile;
  baseGamingHoursAt100: number;
  baseOfficeHoursAt100: number;
}

export type AlertType =
  | "low_battery_15pct"
  | "critical_battery_5pct"
  | "end_of_day_plug_in"
  | "charge_limit_80_reached"
  | "full_charge_100_reached"
  | "health_degraded"
  | "connection_lost";

export type DeliveryMode =
  | "in_game_focus_overlay"
  | "os_native_toast"
  | "widget_inline_banner"
  | "tray_badge";

export type SuppressionReason =
  | "user_dnd_enabled"
  | "fullscreen_suppression_rule"
  | "cooldown_active"
  | "os_notifications_blocked"
  | "disabled"
  | "battery_above_threshold";

export type AlertActionTaken =
  | "mute_rgb_clicked"
  | "turn_off_rgb_clicked"
  | "plugged_in_device"
  | "remind_me_later_clicked"
  | "open_widget_clicked"
  | "open_health_clicked"
  | "charge_to_100_clicked"
  | "reconnect_clicked"
  | "unplugged_at_80pct";

export type DismissMethod =
  | "timeout"
  | "close_button"
  | "ignore_button"
  | "swipe_or_esc";

export interface ActiveAlert {
  alertId: string;
  alertType: AlertType;
  slotId: PeripheralDevice["slotId"];
  deviceType: DeviceType;
  connectionType: ConnectionType;
  batteryPct: number;
  deliveryMode: DeliveryMode;
  isFullscreen: boolean;
  createdAtMs: number;
}

export type SuggestionType =
  | "turn_off_rgb"
  | "dim_rgb_50pct"
  | "enable_sleep_timer"
  | "lower_polling_rate"
  | "lower_brightness";

export type SuggestionSurface =
  | "tray_widget"
  | "overlay_toast"
  | "settings_window";

export interface ActiveSuggestionRecord {
  suggestionId: string;
  suggestionType: SuggestionType;
  slotId: PeripheralDevice["slotId"];
  deviceType: DeviceType;
  surface: SuggestionSurface;
  estimatedGainHours: number;
  shownAtMs: number;
  appliedAtMs?: number;
  revertedAtMs?: number;
}

export type PermissionType =
  | "os_notifications"
  | "overlay_compositor_access"
  | "linux_udev_hid_access";

export type PermissionStatus =
  | "granted"
  | "denied"
  | "not_applicable"
  | "unsupported"
  | "error";

export interface AppSettings {
  os: OsPlatform;
  osVersionBucket: OsVersionBucket;
  displayServer: DisplayServer;
  distro: LinuxDistro;
  locale: Locale;
  notificationsEnabled: boolean;
  inGameOverlayEnabled: boolean;
  fullscreenSuppressionEnabled: boolean;
  isFullscreenActive: boolean;
  dndEnabled: boolean;
  endOfDayPromptEnabled: boolean;
  lowBatteryThresholdPct: 5 | 10 | 15 | 20;
  launchAtLogin: boolean;
  autoUpdate: boolean;
  trayIconStyle: "battery" | "icon" | "percent";
  pollInterval: "5s" | "10s" | "30s" | "60s";
  udevPermissionStatus: PermissionStatus;
  notificationPermissionStatus: PermissionStatus;
  overlayPermissionStatus: PermissionStatus;
}

export type P0EventName =
  | "telemetry_consent_granted"
  | "app_installed"
  | "app_launched"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "device_connected"
  | "device_disconnected"
  | "widget_opened"
  | "battery_state_changed"
  | "battery_health_viewed"
  | "power_saving_suggestion_shown"
  | "power_saving_suggestion_applied"
  | "power_saving_suggestion_reverted"
  | "alert_shown"
  | "alert_actioned"
  | "alert_dismissed"
  | "alert_suppressed"
  | "permission_result"
  | "setting_changed"
  | "charge_limit_overridden"
  | "error_occurred"
  | "app_updated";

export interface TelemetryEnvelopeEvent {
  event: P0EventName;
  distinct_id: string;
  uuid: string;
  timestamp: string;
  properties: Record<string, string | number | boolean>;
}
