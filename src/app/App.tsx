import { useCallback, useEffect, useRef, useState } from "react";
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  Bell,
  ChevronDown,
  Pin,
  PlugZap,
  Power,
  RefreshCw,
  Zap,
  X,
} from "lucide-react";
import { DeviceIcon } from "../features/battery/DeviceIcon";
import {
  connectionBadge,
  deviceSubtitle,
  deviceKey,
  hasBatteryReading,
  evaluateLowBattery,
} from "../features/battery/deviceStatus";
import {
  hideWidgetWindow,
  isTauriDesktopRuntime,
  loadLocalBootstrap,
  persistLocalState,
  sendLowBatteryNotification,
  setWidgetPinned,
  subscribeLocalStream,
  toggleOsAutostart,
  type LocalBootstrapPayload,
} from "../platform/desktopBridge";
import { DICTIONARIES } from "../shared/i18n";
import { INITIAL_DEVICES, INITIAL_SETTINGS } from "../shared/defaults";
import type { AppSettings, Locale, PeripheralDevice } from "../shared/types";

function formatLastUpdated(ts: number | null, locale: Locale) {
  if (!ts) return locale === "mn" ? "Шинэчлэгдээгүй" : "Not updated";
  const diff = Date.now() - ts;
  if (diff < 15000) return locale === "mn" ? "Дөнгөж сая" : "Updated just now";
  if (diff < 60000) {
    const s = Math.max(1, Math.round(diff / 1000));
    return locale === "mn" ? `${s}с өмнө` : `Updated ${s}s ago`;
  }
  const m = Math.round(diff / 60000);
  return locale === "mn" ? `${m}м өмнө` : `Updated ${m}m ago`;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
        checked ? "bg-emerald-500" : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [devices, setDevices] = useState<PeripheralDevice[]>([]);
  const [chargerConnected, setChargerConnected] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("demo") === "1";
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const notifiedLowSlots = useRef<Set<string>>(new Set());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const initializedSettings = useRef(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const isDesktop = isTauriDesktopRuntime();

  const dict = DICTIONARIES[settings.locale];
  const visibleDevices =
    isDemoMode && devices.length === 0 ? INITIAL_DEVICES : devices;
  const effectiveChargerConnected =
    chargerConnected ||
    visibleDevices.some((d) => d.chargingState === "charging");

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const applySnapshot = useCallback(
    (data: LocalBootstrapPayload | null, allowDemoFallback: boolean) => {
      if (!data) {
        setSyncFailed(true);
        return;
      }
      setSyncFailed(false);
      if (!initializedSettings.current) {
        if (data.settings) {
          setSettings(data.settings);
          settingsRef.current = data.settings;
        }
        initializedSettings.current = true;
      }
      if (typeof data.autostartEnabled === "boolean") {
        setAutostartEnabled(data.autostartEnabled);
      }

      const liveDevices = Array.isArray(data.devices) ? data.devices : [];
      setChargerConnected(Boolean(data.chargerConnected));
      setLastUpdated(Date.now());

      if (liveDevices.length > 0) {
        setDevices(liveDevices);
        setIsDemoMode(false);
        for (const dev of evaluateLowBattery(
          liveDevices,
          settingsRef.current,
          notifiedLowSlots.current,
        )) {
          const isMn = settingsRef.current.locale === "mn";
          void sendLowBatteryNotification(
            `${isMn ? dev.labelMn : dev.labelEn} (${dev.batteryPct}%)`,
            isMn
              ? "Цэнэг бага байна — цэнэглэгчээ залгана уу."
              : "Low battery — please connect charger.",
          );
        }
      } else if (allowDemoFallback) {
        setDevices(INITIAL_DEVICES);
        setIsDemoMode(true);
      } else {
        setDevices([]);
      }
    },
    [],
  );

  const fetchSnapshot = useCallback(
    async (allowDemoFallback: boolean, force = false) => {
      const data = await loadLocalBootstrap(force);
      applySnapshot(data, allowDemoFallback);
    },
    [applySnapshot],
  );

  // Initial local hardware load
  useEffect(() => {
    let cancelled = false;
    const isDemoQuery =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    fetchSnapshot(isDemoQuery, true)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSnapshot]);

  // Real-time hardware sync: SSE stream on web + 1.5s cached Rust monitor poll when desktop widget is visible
  useEffect(() => {
    if (!hydrated) return;
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible" && !isDemoMode) {
        void fetchSnapshot(false, false);
      }
    };
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    const unsubscribeStream = isDemoMode
      ? () => {}
      : subscribeLocalStream((payload) => {
          if (document.visibilityState === "visible") {
            applySnapshot(payload, false);
          }
        });

    const intervalMs = isDesktop ? 1500 : 5000;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && !isDemoMode) {
        void fetchSnapshot(false, false);
      }
    }, intervalMs);

    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      unsubscribeStream();
      window.clearInterval(id);
    };
  }, [hydrated, isDemoMode, isDesktop, fetchSnapshot, applySnapshot]);

  // Persist language preference locally
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void persistLocalState(settings, devices);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [hydrated, settings, devices]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    void fetchSnapshot(false, true).finally(() => {
      window.setTimeout(() => setIsRefreshing(false), 450);
    });
  };

  const handleToggleLocale = (locale: Locale) => {
    setSettings((prev) => ({ ...prev, locale }));
  };

  const handleToggleAutostart = () => {
    const next = !autostartEnabled;
    setAutostartEnabled(next);
    setSettings((prev) => ({ ...prev, launchAtLogin: next }));
    void toggleOsAutostart(next).then((confirmed) => {
      setAutostartEnabled(confirmed);
    });
  };

  const handleTogglePin = () => {
    const next = !pinned;
    setPinned(next);
    void setWidgetPinned(next);
  };

  const handleEnableDemo = () => {
    setDevices(INITIAL_DEVICES);
    setIsDemoMode(true);
    setLastUpdated(Date.now());
  };

  const handleExitDemo = () => {
    setIsDemoMode(false);
    void fetchSnapshot(false, true);
  };

  const toggleCard = (slotId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const isMn = settings.locale === "mn";

  return (
    <div className="min-h-screen bg-[#0D1118] text-slate-100 flex items-center justify-center p-4">
      <main className="w-full max-w-[380px]">
        <section
          aria-label={isMn ? "Батарей ба Цэнэглэгч" : "Battery & Charger"}
          className="rounded-2xl border border-white/[0.07] bg-[#121722] shadow-2xl shadow-black/40 overflow-hidden"
        >
          {/* Header */}
          <div
            data-tauri-drag-region
            className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.06] select-none"
          >
            <div
              data-tauri-drag-region
              className="flex items-center gap-2 min-w-0 flex-1"
            >
              <Battery
                className="w-4 h-4 text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <h1 className="text-[13px] font-semibold text-slate-100 tracking-tight truncate">
                {isMn ? "Батарей & Цэнэглэгч" : "Battery & Charger"}
              </h1>
              {isDemoMode && (
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {isMn ? "Жишээ" : "Sample"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <div
                role="group"
                aria-label="Language"
                className="flex items-center rounded-lg border border-white/[0.08] bg-[#0D1118] p-0.5 mr-1"
              >
                <button
                  type="button"
                  onClick={() => handleToggleLocale("en")}
                  aria-pressed={settings.locale === "en"}
                  title="English"
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                    settings.locale === "en"
                      ? "bg-slate-700/80 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLocale("mn")}
                  aria-pressed={settings.locale === "mn"}
                  title="Монгол"
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                    settings.locale === "mn"
                      ? "bg-slate-700/80 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  MN
                </button>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Refresh battery status"
                title={isMn ? "Шинэчлэх" : "Refresh"}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 transition-transform ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
              {isDesktop && (
                <>
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    aria-pressed={pinned}
                    aria-label={pinned ? "Unpin widget" : "Pin widget on top"}
                    title={
                      pinned
                        ? isMn
                          ? "Бэхэлгээг арилгах"
                          : "Unpin"
                        : isMn
                          ? "Дээр бэхлэх"
                          : "Pin on top"
                    }
                    className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                      pinned
                        ? "text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void hideWidgetWindow()}
                    aria-label="Close widget"
                    title={isMn ? "Хаах" : "Close"}
                    className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Status Banner */}
          {hydrated && (
            <div className="px-4 pt-3 pb-1">
              <div
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs border transition-colors ${
                  effectiveChargerConnected
                    ? "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-200"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400"
                }`}
              >
                <span className="flex items-center gap-2 font-medium min-w-0">
                  {effectiveChargerConnected ? (
                    <>
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      <PlugZap
                        className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                    </>
                  ) : (
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-slate-600" />
                  )}
                  <span className="truncate">
                    {effectiveChargerConnected
                      ? isMn
                        ? "Цэнэглэгч залгагдсан"
                        : "Charger Connected"
                      : isMn
                        ? "Цэнэглэгч салгагдсан"
                        : "Charger Unplugged"}
                  </span>
                </span>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums bg-white/[0.06] text-slate-200 border border-white/[0.06]">
                  {isMn
                    ? `${visibleDevices.length} төхөөрөмж`
                    : `${visibleDevices.length} device${visibleDevices.length === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>
          )}

          {syncFailed && (
            <p
              role="status"
              className="mx-4 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200"
            >
              {isMn
                ? "Шинэчилж чадсангүй. Өмнөх мэдээлэл харагдаж байна."
                : "Refresh failed. Showing the last received data."}
            </p>
          )}
          {/* Body */}
          {!hydrated ? (
            <div className="px-4 py-10 text-center text-xs text-slate-400">
              {dict.scanning}
            </div>
          ) : visibleDevices.length === 0 ? (
            <div className="px-5 py-8 text-center space-y-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <Battery className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-100">
                  {isMn
                    ? "Батарей эсвэл цэнэглэгч олдсонгүй"
                    : "No battery devices detected"}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isMn
                    ? "Системийн батарей эсвэл утасгүй төхөөрөмжөө залгаад шалгана уу."
                    : "Connect your charger or wireless device to read battery status."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors"
                >
                  {dict.scanDevices}
                </button>
                <button
                  type="button"
                  onClick={handleEnableDemo}
                  className="px-3.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-slate-200 transition-colors"
                >
                  {isMn ? "Жишээ харах" : "Sample Preview"}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 flex flex-col gap-2.5">
              {visibleDevices.map((device) => {
                const hasBatteryPct = hasBatteryReading(device);
                const name = isMn ? device.labelMn : device.labelEn;
                const isCharging =
                  hasBatteryPct && device.chargingState === "charging";
                const isFull =
                  hasBatteryPct &&
                  (device.chargingState === "full" || device.batteryPct >= 100);
                const isLow =
                  hasBatteryPct &&
                  device.batteryPct <= 20 &&
                  !isCharging &&
                  !isFull;
                const isMedium =
                  hasBatteryPct &&
                  device.batteryPct > 20 &&
                  device.batteryPct <= 50 &&
                  !isCharging &&
                  !isFull;
                const isHealthy =
                  hasBatteryPct &&
                  device.batteryPct > 50 &&
                  !isCharging &&
                  !isFull;
                const expanded = expandedCards.has(deviceKey(device));
                const subtitle = deviceSubtitle(device, isMn ? "mn" : "en");
                const badge = connectionBadge(device, isMn ? "mn" : "en");

                let barStyle: React.CSSProperties = {};
                let barClass = "bg-slate-600/70";
                if (!hasBatteryPct) {
                  barClass = "bg-slate-600/50";
                } else if (isCharging) {
                  barClass =
                    "charging-shimmer bg-gradient-to-r from-[#10B981] to-[#34D399]";
                  barStyle = { position: "relative", overflow: "hidden" };
                } else if (isLow) {
                  barClass = "bg-[#EF4444]";
                } else if (isMedium) {
                  barClass = "bg-[#F59E0B]";
                } else {
                  barClass = "bg-[#10B981]";
                }

                const pctColor = !hasBatteryPct
                  ? "text-slate-400"
                  : isLow
                    ? "text-[#EF4444]"
                    : isCharging
                      ? "text-emerald-400"
                      : isMedium
                        ? "text-[#F59E0B]"
                        : "text-slate-100";

                const subtitleColor = isLow
                  ? "text-red-400/90"
                  : isCharging
                    ? "text-emerald-400/90"
                    : "text-slate-400";

                const cardBorder = isLow
                  ? "border-red-500/30 hover:border-red-500/40"
                  : "border-white/[0.07] hover:border-white/[0.12]";

                return (
                  <div
                    key={deviceKey(device)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    onClick={() => toggleCard(deviceKey(device))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCard(deviceKey(device));
                      }
                    }}
                    className={`group rounded-xl border ${cardBorder} bg-[#141923] hover:bg-[#18202E] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50`}
                  >
                    <div className="px-3.5 py-3 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                              isLow
                                ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : isCharging
                                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                                  : "border-white/[0.08] bg-white/[0.03] text-slate-300"
                            }`}
                          >
                            <DeviceIcon
                              type={device.type}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-medium text-slate-100 leading-tight">
                                {name}
                              </span>
                              <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-300 leading-none">
                                {badge}
                              </span>
                            </div>
                            <p
                              className={`mt-0.5 text-[11.5px] leading-snug tabular-nums ${subtitleColor}`}
                            >
                              {subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <div className="flex items-center gap-1.5">
                            {isCharging && (
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shadow-sm">
                                <Zap className="w-3 h-3" strokeWidth={2.5} />
                              </span>
                            )}
                            {isLow && !isCharging ? (
                              <BatteryLow
                                className="w-4 h-4 text-red-400"
                                aria-hidden="true"
                              />
                            ) : isCharging ? (
                              <BatteryCharging
                                className="w-4 h-4 text-emerald-400"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span
                              className={`text-lg font-semibold tabular-nums leading-none ${pctColor}`}
                            >
                              {hasBatteryPct ? `${device.batteryPct}%` : "--"}
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                              expanded ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      {device.batteryComponents &&
                        device.batteryComponents.length > 0 && (
                          <div
                            className="grid grid-cols-3 gap-2"
                            aria-label={
                              isMn
                                ? "Хэсэг тус бүрийн цэнэг"
                                : "Component batteries"
                            }
                          >
                            {device.batteryComponents.map((component) => (
                              <div
                                key={component.id}
                                className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs"
                              >
                                <span className="block text-[10px] text-slate-400">
                                  {
                                    {
                                      left: isMn ? "Зүүн" : "Left",
                                      right: isMn ? "Баруун" : "Right",
                                      case: isMn ? "Кейс" : "Case",
                                      headphone: isMn ? "Чихэвч" : "Headphones",
                                    }[component.id]
                                  }
                                </span>
                                <span
                                  className={
                                    component.charging
                                      ? "text-emerald-300"
                                      : "text-slate-200"
                                  }
                                >
                                  {component.batteryPct}%
                                  {component.charging ? " ⚡" : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      {/* Progress bar */}
                      <div className="h-[6px] w-full rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${barClass}`}
                          style={{
                            ...barStyle,
                            width: hasBatteryPct
                              ? `${Math.max(0, Math.min(100, device.batteryPct))}%`
                              : "100%",
                          }}
                        />
                      </div>

                      {/* Expanded drawer */}
                      <div
                        className={`grid transition-all duration-200 ease-out ${
                          expanded
                            ? "grid-rows-[1fr] opacity-100 mt-0.5"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div
                            className="pt-2 mt-0.5 border-t border-white/[0.06] flex flex-col gap-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {device.batterySource && (
                              <p className="text-[11px] text-slate-500">
                                {isMn
                                  ? "Мэдээллийн эх сурвалж"
                                  : "Battery source"}
                                : {device.batterySource}
                              </p>
                            )}
                            {device.type === "laptop" ? (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400">
                                    {isMn
                                      ? "Батарейн эрүүл мэнд"
                                      : "Battery Health"}
                                  </span>
                                  <span className="font-medium tabular-nums text-slate-100">
                                    {device.supportsHealth
                                      ? `${device.healthPct}%`
                                      : "--"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  {isMn
                                    ? "Цэнэгийн хязгаарыг системийн тохиргооноос удирдана."
                                    : "Manage the charge limit in system settings."}
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400">
                                    {isMn ? "Холболт" : "Connection"}
                                  </span>
                                  <span className="font-medium text-slate-200">
                                    {connectionBadge(device, settings.locale)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-xs">
                                  <span className="text-slate-400 leading-snug">
                                    {isMn
                                      ? "20% үед бага цэнэгийн сануулга"
                                      : "Low-battery alert at 20%"}
                                  </span>
                                  <Toggle
                                    checked={
                                      settings.lowBatteryThresholdPct === 20
                                    }
                                    onChange={() =>
                                      setSettings((prev) => ({
                                        ...prev,
                                        lowBatteryThresholdPct:
                                          prev.lowBatteryThresholdPct === 20
                                            ? 15
                                            : 20,
                                      }))
                                    }
                                    label="Low-battery alert at 20%"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[#0F131B] border-t border-white/[0.06] flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              role="switch"
              aria-checked={autostartEnabled}
              onClick={handleToggleAutostart}
              className="flex items-center gap-2 min-w-0 text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-md"
            >
              <Power
                className={`w-3.5 h-3.5 shrink-0 ${
                  autostartEnabled ? "text-emerald-400" : "text-slate-500"
                }`}
                aria-hidden="true"
              />
              <span className="leading-tight">
                {isMn ? "Систем асахад хамт эхлэх" : "Auto-run on login"}
              </span>
              <span
                className={`ml-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  autostartEnabled ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    autostartEnabled ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0 text-slate-400">
              {isDemoMode ? (
                <button
                  type="button"
                  onClick={handleExitDemo}
                  className="text-[11px] text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap"
                >
                  {isMn ? "Бодит шалгах" : "Exit Sample"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    notificationsEnabled: !prev.notificationsEnabled,
                  }))
                }
                aria-pressed={settings.notificationsEnabled}
                title={
                  isMn
                    ? settings.notificationsEnabled
                      ? "Мэдэгдэл унтраах"
                      : "Мэдэгдэл асаах"
                    : settings.notificationsEnabled
                      ? "Disable notifications"
                      : "Enable notifications"
                }
                aria-label={
                  isMn ? "Мэдэгдлийн тохиргоо" : "Notification settings"
                }
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
              >
                <Bell
                  className={`w-3.5 h-3.5 ${settings.notificationsEnabled ? "text-emerald-400" : "text-slate-600"}`}
                />
              </button>
              <span className="text-[10.5px] tabular-nums text-slate-500 whitespace-nowrap">
                {formatLastUpdated(lastUpdated, settings.locale)}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
