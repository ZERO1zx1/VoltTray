import React from "react";
import { BatteryWarning, Lock, ShieldCheck, X } from "lucide-react";
import type { Dictionary } from "../../shared/i18n";
import type {
  ActiveAlert,
  AlertActionTaken,
  DismissMethod,
  Locale,
  PeripheralDevice,
} from "../../shared/types";

interface OverlayToastProps {
  alert: ActiveAlert;
  device: PeripheralDevice | undefined;
  locale: Locale;
  dict: Dictionary;
  onAction: (alert: ActiveAlert, action: AlertActionTaken) => void;
  onDismiss: (alert: ActiveAlert, method: DismissMethod) => void;
}

export const OverlayToast: React.FC<OverlayToastProps> = ({
  alert,
  device,
  locale,
  dict,
  onAction,
  onDismiss,
}) => {
  const deviceLabel = device
    ? locale === "mn"
      ? device.labelMn
      : device.labelEn
    : alert.deviceType;

  const isLow =
    alert.alertType === "low_battery_15pct" ||
    alert.alertType === "critical_battery_5pct";
  const isEod = alert.alertType === "end_of_day_plug_in";
  const isLimit80 = alert.alertType === "charge_limit_80_reached";

  const borderStyle = isLow
    ? "border-amber-500/50 bg-[#1B1612]/95"
    : isLimit80
      ? "border-emerald-500/40 bg-[#121A17]/95"
      : "border-indigo-500/40 bg-[#151A25]/95";

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Peripheral Battery Alert"
      className={`fixed bottom-5 right-5 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-transform ${borderStyle}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isLow && (
              <BatteryWarning
                className="w-5 h-5 text-amber-400"
                aria-hidden="true"
              />
            )}
            {isEod && (
              <Lock className="w-5 h-5 text-indigo-400" aria-hidden="true" />
            )}
            {isLimit80 && (
              <ShieldCheck
                className="w-5 h-5 text-emerald-400"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              {isLow &&
                dict.alertsView.overlayTitleLow
                  .replace("{device}", deviceLabel)
                  .replace("{pct}", String(alert.batteryPct))}
              {isEod && dict.alertsView.eodTitle}
              {isLimit80 &&
                dict.alertsView.limit80Title.replace("{device}", deviceLabel)}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isLow &&
                (alert.deliveryMode === "in_game_focus_overlay"
                  ? locale === "mn"
                    ? "Тоглоом/ажлыг таслахгүй булангийн мэдэгдэл"
                    : "Non-intrusive overlay · fullscreen window stays focused"
                  : locale === "mn"
                    ? "Системийн мэдэгдэл"
                    : "OS native notification")}
              {isEod &&
                dict.alertsView.eodBody
                  .replace("{device}", deviceLabel)
                  .replace("{pct}", String(alert.batteryPct))}
              {isLimit80 && dict.alertsView.limit80Body}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close notification"
          onClick={() => onDismiss(alert, "close_button")}
          className="text-slate-400 hover:text-white rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        {isLow && (
          <>
            <button
              type="button"
              onClick={() => onAction(alert, "mute_rgb_clicked")}
              className="flex-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {dict.alertsView.muteRgbAction}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(alert, "ignore_button")}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {dict.alertsView.ignoreAction}
            </button>
          </>
        )}

        {isEod && (
          <>
            <button
              type="button"
              onClick={() => onAction(alert, "plugged_in_device")}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {dict.alertsView.plugInNow}
            </button>
            <button
              type="button"
              onClick={() => onAction(alert, "remind_me_later_clicked")}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {dict.alertsView.remindMe}
            </button>
          </>
        )}

        {isLimit80 && (
          <>
            <button
              type="button"
              onClick={() => onAction(alert, "unplugged_at_80pct")}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {dict.alertsView.unplugAt80}
            </button>
            <button
              type="button"
              onClick={() => onAction(alert, "charge_to_100_clicked")}
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {dict.alertsView.chargeOnce100}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
