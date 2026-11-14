import type { AppSettings, Locale, PeripheralDevice } from "../../shared/types";

export function deviceKey(device: PeripheralDevice): string {
  return (
    device.deviceId ??
    `${device.type}:${device.connectionType}:${device.labelEn}:${device.slotId}`
  );
}

export function hasBatteryReading(device: PeripheralDevice): boolean {
  return (
    device.connected &&
    device.batteryAvailable !== false &&
    Number.isFinite(device.batteryPct) &&
    device.batteryPct >= 0 &&
    device.batteryPct <= 100
  );
}

export function connectionBadge(
  device: PeripheralDevice,
  locale: Locale,
): string {
  if (device.connectionTypes && device.connectionTypes.length > 1) {
    return device.connectionTypes.map(connectionType => connectionBadge({ ...device, connectionTypes: undefined, connectionType }, locale)).join(" + ");
  }
  if (device.type === "laptop") return locale === "mn" ? "Систем" : "System";
  return {
    bluetooth: "Bluetooth",
    usb_dongle_2_4ghz: "2.4GHz",
    wired_usb: "USB",
    unknown: locale === "mn" ? "Тодорхойгүй" : "Unknown",
  }[device.connectionType];
}

export function deviceSubtitle(
  device: PeripheralDevice,
  locale: Locale,
): string {
  const mn = locale === "mn";
  if (!device.connected) return mn ? "Холболт тасарсан" : "Disconnected";
  if (!hasBatteryReading(device))
    return mn
      ? "Холбогдсон • Цэнэгийн мэдээлэлгүй"
      : "Connected • Battery unavailable";
  if (device.chargingState === "charging")
    return mn ? "Цэнэглэж байна" : "Charging";
  if (device.chargingState === "full")
    return mn ? "Цэнэг дүүрсэн" : "Fully charged";
  if (device.chargingState === "paused_limit")
    return mn ? "Цэнэглэлт түр зогссон" : "Charging paused";
  if (device.chargingState === "unknown")
    return mn ? "Цэнэглэлтийн төлөв тодорхойгүй" : "Charging state unavailable";
  return mn ? "Батарейгаар ажиллаж байна" : "On battery";
}

/** Hysteresis avoids repeated alerts around the configured threshold. */
export function evaluateLowBattery(
  devices: PeripheralDevice[],
  settings: AppSettings,
  alerted: Set<string>,
): PeripheralDevice[] {
  const alerts: PeripheralDevice[] = [];
  for (const device of devices) {
    if (!hasBatteryReading(device)) continue;
    const key = deviceKey(device);
    if (
      device.chargingState === "charging" ||
      device.chargingState === "full" ||
      device.batteryPct > settings.lowBatteryThresholdPct + 5
    ) {
      alerted.delete(key);
      continue;
    }
    if (
      !settings.notificationsEnabled ||
      settings.dndEnabled ||
      (settings.fullscreenSuppressionEnabled && settings.isFullscreenActive)
    )
      continue;
    if (
      device.batteryPct <= settings.lowBatteryThresholdPct &&
      !alerted.has(key)
    ) {
      alerted.add(key);
      alerts.push(device);
    }
  }
  return alerts;
}
