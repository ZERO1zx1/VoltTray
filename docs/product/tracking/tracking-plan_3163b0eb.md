# Peripheral Battery App — Analytics Tracking Plan

**Status:** Draft v0.2 (merged)
**Date:** 2026-11-13
**Scope:** Windows and Linux desktop utility (native or Electron; stack TBD)
**Source designs:** `docs/sudalgaa/design_v2/ux/ux.txt`, `docs/sudalgaa/design_v2/ui/ux.png`, `docs/sudalgaa/design_v1/ux/ux.txt`
**Inputs:** v0.1 plan in this repo; v1.0 draft supplied by the team (2026-11-13)
**Owners:** Product TBD · Engineering TBD · Privacy/legal TBD

> **Товч дүгнэлт (Mongolian summary)**
> Энэхүү баримт бичиг нь Windows/Linux дээр ажиллах дагалдах хэрэгслийн (хулгана, гар, чихэвч) батерейны апп-ын analytics tracking plan юм.
> Гол зорилго: аль боломж хэрэглэгчид бодит үнэ цэнэ өгч байгааг хэмжих.
> Санал болгож буй шийдэл: **PostHog Cloud EU** (эсвэл self-host). Учир нь санамсаргүй `install_id`-аар activation, funnel, D7/D30 retention, update adoption хэмжих боломжтой. **Aptabase** нь persistent ID хадгалдаггүй тул эдгээрийг хэмжих боломжгүй.
> v1-д **23 P0 event** (22 үндсэн + onboarding step) байна. Consent нь opt-in; зөвшөөрөл өгөхөөс өмнө ямар ч өгөгдөл хадгалахгүй, илгээхгүй.
> Төхөөрөмжийн нэр, serial, MAC/Bluetooth ID, цонх/тоглоомын нэр, файлын зам, IP хаяг цуглуулахгүй.
> PostHog-ийн anonymous event нь person profile үүсгэдэггүй тул PostHog cohort болон lifecycle insight ажиллахгүй; оронд нь `install_id` дээр суурилсан retention/funnel болон install-week analysis group ашиглана.
> Дараагийн алхам: технологийн stack, consent/legal текстийг баталгаажуулж, event schema-г код болгох.

**Contents:** [1. Purpose](#1-what-this-plan-is-for) · [2. Tool decision](#2-tool-decision-comes-first) · [3. Measurement model](#3-measurement-model) · [4. Naming](#4-naming-and-property-conventions) · [5. Event dictionary](#5-event-dictionary) · [6. Property dictionary](#6-property-dictionary) · [7. Key events and joins](#7-key-events-and-joins) · [8. KPIs](#8-kpis-and-observation-windows) · [9. Privacy](#9-privacy-consent-and-data-governance) · [10. Implementation](#10-implementation-notes) · [11. QA](#11-qa-and-validation-checklist) · [12. Dashboards and decision rules](#12-dashboards-and-decision-rules) · [13. Acquisition](#13-acquisition-and-utm-mapping-for-a-desktop-app) · [14. Volume budget](#14-event-volume-budget) · [15. Open questions](#15-open-questions-and-assumptions) · [Appendix A](#appendix-a--example-payloads) · [Appendix B](#appendix-b--pre-launch-instrumentation-checklist)

---

## 1. What this plan is for

The v2 design adds five value layers on top of a battery percentage:

1. **Predictive lifespan** — "8h gaming / 24h office" instead of "72%".
2. **One-click power savings** — turn off RGB, sleep timer, polling/brightness changes.
3. **Connection and health visibility** — wired, Bluetooth, 2.4 GHz dongle; health and 80% charge limit.
4. **Non-intrusive alerts** — toasts/overlays that do not interrupt fullscreen games or meetings.
5. **End-of-day routine** — "plug in your headset before locking your PC" prompts.

The v1 design also contributes the fast-charge, 80% charge-limit, low-battery, and full-charge states. This plan measures whether those layers are used, useful, and retained. Every event must inform one of these decisions:

| ID | Decision it informs |
|---|---|
| D1 | Are new installs reaching first value (device connected plus first usable insight), or dropping in onboarding? |
| D2 | Which power-saving actions do users adopt, and which do they immediately revert? |
| D3 | Do low-battery and end-of-day alerts help (action) or annoy (dismiss/suppress)? |
| D4 | Is the predictive/eco layer used, or is the app just a background battery monitor? |
| D5 | Which device/connection/OS contexts need support (Bluetooth vs dongle vs wired; Windows vs Linux)? |
| D6 | Do users stay after week 1, and do updates reach them? |
| D7 | Is the 80% charge limit used or routinely overridden, and is battery health inspected? |

If an event does not change a decision (or satisfy a stated privacy/acquisition requirement), it does not ship.

**Scope boundary:** this is product analytics, not crash reporting, marketing attribution, or support tooling. Keep crash reporting separate if a dedicated tool is chosen (see §15), and keep ad-platform pixels off the desktop app.

---

## 2. Tool decision comes first

The tool determines which questions are answerable at all. Do not pick it after instrumentation.

### Recommendation

**Use [PostHog Cloud EU](https://posthog.com/docs/privacy/data-storage) (Frankfurt), or self-hosted PostHog if data residency requires it.**

Why:

- A random, locally stored `install_id` makes activation, funnels, D7/D30 retention, and update adoption measurable. [Aptabase](https://aptabase.com/legal/privacy) deliberately has no persistent identifier, so those questions cannot be answered.
- [`posthog-node`](https://posthog.com/docs/libraries/node) runs in the Electron main process, so tray/background events are captured even when no window is open. For a native app, the capture API works the same way.
- Anonymous events (`$process_person_profile: false`) are priced lower than identified events and avoid person-profile processing. See [PostHog anonymous vs identified events](https://posthog.com/docs/data/anonymous-vs-identified-events).
- Feature flags let you stage a new alert or suggestion to 10% of installs without shipping a second build.
- You can turn off what you do not need: autocapture, session replay, heatmaps, surveys, GeoIP.

**Use Aptabase instead only if** legal review forbids a persistent pseudonymous ID. In that case, accept that D6 (multi-day retention/update adoption) and 7-day suggestion reverts (D2) are out of scope for v1. Aptabase remains a good choice for simple event counts and is operationally simpler.

**Do not use GA4 as the primary product analytics tool for a desktop utility.** Its Measurement Protocol is server-oriented, requires you to manage `client_id` yourself, has no built-in offline queue, and its reports are web-centric. It can remain on the marketing site if the site already uses it.

**Do not run two product analytics tools.** One source of truth, one event dictionary.

### Comparison

| Criterion | PostHog | Aptabase | Mixpanel / Amplitude | GA4 |
|---|---|---|---|---|
| Persistent anonymous install ID | Yes | **No, by design** | Yes | Yes, but `client_id` plumbing is manual |
| Multi-day funnels and retention | Yes | No | Yes | Limited / report-dependent |
| Anonymous event mode | Yes (`$process_person_profile: false`) | Privacy-first by default | Varies | Consent-heavy |
| Desktop SDKs | Electron + Node SDK; native via capture API | Electron, Tauri, .NET MAUI, C++, etc. | SDKs + HTTP APIs | Measurement Protocol only |
| Feature flags / staged rollout | Yes | No | Some plans | No |
| Privacy controls | Configurable; self-host; disable replay/autocapture/GeoIP | No IDs, no stored IP | Configurable | Consent-heavy |
| Effort for this app | Medium | Low | Medium | High for desktop |
| Free tier (current) | 1M events/month, 1-year retention | 20k events/month | Varies | Free |
| Cost at 3M anonymous events/month | ~$84/month | Varies by plan | Varies | Free, but unsuitable |

### Cost math

PostHog product analytics bills per event, with the first 1M events free each month. Anonymous-event rates as of November 2026: $0.00005/event for 1M–2M, $0.0000343/event for 2M–15M. See [PostHog pricing](https://posthog.com/pricing).

| Monthly anonymous events | Estimated cost |
|---|---|
| 1M | $0 |
| 2.22M (10k DAU × 7.4/day × 30) | ~$58 |
| 3M | ~$84 |

These figures exclude tax and assume anonymous events. Identified events add a person-profile charge (roughly 3–5× the anonymous rate in the first paid bands). Verify current pricing before budgeting; rates change.

### Critical limitation: anonymous events and PostHog cohorts

With `$process_person_profile: false`, PostHog does **not** create person profiles. You can still use trends, funnels, retention, and SQL insights keyed by `distinct_id`, but you **cannot** create PostHog cohorts, use lifecycle insights, filter by person properties, or use group analytics. See [PostHog anonymous events](https://posthog.com/docs/data/anonymous-vs-identified-events).

This plan therefore uses **install-week analysis groups** computed from event timestamps, not PostHog person cohorts. If the team needs true PostHog cohorts, it must accept identified events and budget for the person-profile charge. Do not promise cohort features the chosen event mode cannot deliver.

---

## 3. Measurement model

### Entities

| Entity | Definition | Notes |
|---|---|---|
| `install_id` | Random UUID v4 created after consent and stored locally | Never derived from hardware. Resettable in Settings → Privacy. |
| `session_id` | Random UUID per app process start | A tray app can run for days; a session is a process lifetime, not a foreground window. |
| `device_type` | Category: `mouse`, `keyboard`, `headset`, `controller`, `other`, `unknown` | Never the raw device name. |
| `device_slot_id` | Optional ephemeral slot (`slot_1`..`slot_8`) assigned per install | Never USB VID:PID, serial, or Bluetooth address. Slots must stay stable for the install's lifetime or joins break. |
| `alert_id` | UUID generated when an alert enters the decision function | Joins shown → actioned/dismissed. |
| `suggestion_id` | UUID generated when a suggestion is first presented | Joins shown → applied/reverted. |

### Definitions

- **Active install:** at least one `app_launched` in the window.
- **Engaged install:** at least one `widget_opened` or `alert_actioned` in the window.
- **Activated install (primary):** first-ever `device_connected` within 7 days of `app_installed`, among first-run consenters.
- **First insight (secondary):** first `widget_opened` or `battery_health_viewed` within 7 days of `app_installed`, among activated installs.
- **Install-week analysis group:** installs grouped by install week (Monday–Sunday, UTC). This is a logical group computed from event timestamps, **not** a PostHog person cohort. Groups whose observation window has not ended are **pending**, not failed; exclude them and label them.

### Event flow

```
telemetry_consent_granted            # first run; nothing is sent before this
  └─ app_installed                   # first run only, after consent
       └─ app_launched               # every process start, including the first
            └─ onboarding_started
                 ├─ onboarding_step_completed (welcome)
                 ├─ onboarding_step_completed (device_scan)
                 ├─ device_connected
                 └─ onboarding_completed
                      ├─ widget_opened
                      ├─ power_saving_suggestion_shown
                      │    → power_saving_suggestion_applied
                      │    → power_saving_suggestion_reverted
                      └─ alert_shown → alert_actioned | alert_dismissed
```

`device_connected` can happen outside onboarding (auto scan, reconnect, manual add), so the flow is logical, not a strict sequence. The consent screen is not an onboarding step.

### Consent ordering and late consent

1. User clicks "Enable anonymous analytics".
2. Generate a fresh UUIDv4 `install_id` and persist it locally.
3. Emit `telemetry_consent_granted`.
4. Emit `app_installed` (first run only).
5. Emit `app_launched`.
6. Start onboarding and emit `onboarding_started`.

No analytics event is buffered, written, or sent before step 1. The app works fully when analytics is declined.

**Late consent:** write a local `install_timestamp` at first launch, before consent, and never send it. If the user grants consent later, compute `install_age_days_bucket` from that timestamp. If the timestamp is unavailable, send `install_age_days_bucket=unknown` and report late consenters separately. Do not pretend a late consenter is a day-0 install. Late consenters may have already finished onboarding, so they can lack `onboarding_started`/`onboarding_completed`; exclude them from the onboarding funnel and report them separately.

**Re-opt-in:** when a user revokes and later re-enables analytics, generate a **new** `install_id`. Emit `telemetry_consent_granted` with `is_reopt_in=true`; do **not** emit `app_installed` again. Exclude `is_reopt_in=true` from install counts where possible, and document that re-opt-ins otherwise look like new installs.

**All rates are among consenting installs.** Users who decline cannot be measured in-app without a pre-consent ping. Do not add one unless legal approves it. Use store download counts or update-check counts as an approximate denominator, and label the opt-in rate as approximate.

---

## 4. Naming and property conventions

### Event names

- Format: `object_action`, past tense, lowercase snake_case.
- Examples: `device_connected`, `alert_actioned`, `power_saving_suggestion_applied`.
- No spaces, no camelCase, no provider-reserved names, max 40 characters.
- One event per user action or state transition. Do not emit an event per render or per battery poll.
- Additive changes only. Never rename or repurpose a shipped event; deprecate by stopping it and documenting the replacement.

### Property names and values

- `snake_case` names; lowercase enum values.
- No free text. Every string property is an enum or a bucket defined in this document.
- Booleans are `true`/`false`, not `"yes"`/`"no"`.
- Omit unknown values, or use the defined `unknown` enum value. Never send `"N/A"`, `"null"`, or empty strings.
- Bucket numbers when the exact value adds no decision value (hours, durations, health).
- Maximum ~20 properties per event. Common envelope properties are added automatically.
- Timestamps are ISO 8601 UTC. Durations are integer milliseconds.
- Event and property names stay in English; UI labels can be Mongolian/English. Keep the mapping in code, not in the analytics tool.

### Common envelope (automatic on every event)

| Property | Type | Example | Notes |
|---|---|---|---|
| `event_id` | string (UUID) | `4f1c...` | Dedupe key; maps to PostHog `uuid` or `$insert_id`. |
| `occurred_at` | ISO 8601 UTC | `2026-11-13T09:21:04Z` | Client time; server `received_at` is authoritative for windows. |
| `install_id` | string (UUID) | `a91e...` | PostHog `distinct_id`. |
| `session_id` | string (UUID) | `7c02...` | New per app process start. |
| `app_version` | string | `1.4.2` | Semantic version. |
| `build_channel` | enum | `release` | `release`, `beta`, `dev`. Never mix dev with prod. |
| `os` | enum | `windows` | `windows`, `linux`, `macos` (future). |
| `os_version_bucket` | enum | `win_11` | `win_10`, `win_11`, `linux_kernel_6_x`, `linux_kernel_5_x`, `other`. |
| `arch` | enum | `x64` | `x64`, `arm64`, `x86`. |
| `locale` | enum | `mn` | `mn`, `en`, `other`. UI language, not location. |
| `display_server` | enum | `wayland` | `win32`, `x11`, `wayland`, `unknown`. |
| `distro` | enum | `arch` | `arch`, `debian_ubuntu`, `fedora_rhel`, `opensuse`, `nixos`, `other`. Linux only; omit on Windows. |

The event tables below repeat envelope/install values for readability. In code, add them once (super properties), not per event.

### Install properties (set once per install, sent as super properties)

| Property | Type | Values |
|---|---|---|
| `install_source` | enum | `website`, `github`, `microsoft_store`, `winget`, `aur`, `flatpak`, `snap`, `apt`, `appimage`, `other`, `unknown` |
| `install_source_detail` | string | Controlled campaign code, lowercase `[a-z0-9-]`, max 32 chars; optional |
| `first_app_version` | string | Version at first launch |
| `consent_version` | string | Version of the consent text accepted |
| `plan` | enum | `free`, `pro`, `trial`, `unknown`; only if monetized |

`device_count_bucket` is an event property, not an install super property; it changes as devices are added or removed.

---

## 5. Event dictionary

Priority: **P0** ships with v1, **P1** with the first update, **P2** only if the feature exists.

### 5.1 Lifecycle and consent (P0)

| Event | Fires when | Properties | Decision |
|---|---|---|---|
| `telemetry_consent_granted` | User grants analytics consent (onboarding or Settings). **First event ever sent by an install.** | `consent_surface` (`first_run_modal`, `settings_toggle`), `consent_schema_version`, `is_reopt_in`, `install_age_days_bucket` | D1, privacy |
| `app_installed` | First successful launch after install, **after consent is granted**. If consent is granted later, fire once with `install_age_days_bucket`. | `install_source`, `install_source_detail`, `install_age_days_bucket`, `utm_source`, `utm_medium`, `utm_campaign`, `app_version`, `os`, `os_version_bucket`, `arch`, `locale`, `display_server`, `distro` | D1, D5, acquisition |
| `app_launched` | Each app process start, including OS startup and tray launches. Not on window open. | `launch_trigger` (`user_manual`, `os_autostart`, `post_update_restart`, `tray`, `installer`), `device_count_bucket`, `start_minimized`, `app_version` | D6 |
| `onboarding_started` | First post-consent onboarding step is shown (the consent screen itself is not a step). | `step_count`, `device_count_bucket`, `app_version` | D1 |
| `onboarding_step_completed` | User advances past a step. | `step_number`, `step_name` (`welcome`, `device_scan`, `notifications`, `startup`, `done`), `duration_ms_bucket` | D1 |
| `onboarding_completed` | Post-consent onboarding finishes (or is skipped to the end). | `duration_sec_bucket`, `device_count_bucket`, `notifications_enabled`, `launch_at_startup`, `charge_limit_enabled`, `skipped` | D1 |

In v1, if a user leaves onboarding before the final step, emit nothing; the abandonment is visible as a missing `onboarding_completed`. `onboarding_skipped` (P1) adds the explicit abandonment signal in the first update. If they reach the end via skip, emit `onboarding_completed` with `skipped=true`. Do not emit both as the same action.

**Consent measurement limitation:** events are not sent before consent, so the number of users who decline cannot be measured in-app without a pre-consent ping. Do not add one unless legal approves it. Use store download counts or update-check counts as an approximate denominator, and label the opt-in rate as approximate. All other metrics are among consenting installs and must be labeled that way.

### 5.2 Activation and devices (P0)

| Event | Fires when | Properties | Decision |
|---|---|---|---|
| `device_connected` | A peripheral transitions to connected (auto scan, manual add, or reconnect). Dedupe within 30 seconds. | `device_slot_id`, `device_type`, `connection_type` (`wired_usb`, `bluetooth`, `usb_dongle_2_4ghz`, `unknown`), `source` (`auto_scan`, `manual_add`, `reconnect`), `is_first_device`, `is_reconnect`, `battery_pct_bucket`, `is_charging`, `supports_rgb_control`, `supports_sleep_timer`, `supports_charge_limit`, `supports_health`, `protocol_driver` (`hidpp`, `razer_openrazer`, `steelseries_hid`, `standard_ble_bas`, `upower_generic`, `other`) | D1, D4, D5 |
| `device_disconnected` | A connected peripheral disconnects, powers off, enters deep sleep, or loses transport for >30 seconds. **Do not emit on clean app exit.** | `device_slot_id`, `device_type`, `connection_type`, `reason` (`idle_sleep`, `unplugged_or_switched_off`, `low_battery_cutoff`, `signal_lost`, `unknown`), `last_known_battery_pct_bucket`, `duration_sec_bucket` | D4, D5 |
| `widget_opened` | Tray widget, dashboard, or device list is opened. | `open_trigger` (`tray_icon_click`, `global_hotkey`, `alert_toast_click`, `app_icon`), `device_count_bucket`, `lowest_battery_pct_bucket`, `display_mode_shown` (`predictive_hours_gaming_office`, `percentage_only`) | D1, D4, D6 |
| `battery_state_changed` | **Only** on a charging-state transition or a battery-level threshold crossing, never on a periodic poll. | `device_slot_id`, `device_type`, `connection_type`, `from_charging_state`, `to_charging_state` (`charging`, `discharging`, `full`, `paused_limit`, `unknown`), `battery_level_band` (`normal`, `low`, `critical`, `unknown`), `threshold_crossed` (`none`, `20`, `15`, `10`, `5`, `80`, `100`), `battery_pct_bucket`, `est_gaming_hours_bucket`, `est_office_hours_bucket`, `est_charge_mins_left_bucket` | D2, D3, D7 |
| `battery_health_viewed` | Health detail panel is opened or expanded. Not on every widget render. | `device_slot_id`, `device_type`, `health_pct_bucket`, `charge_limit_enabled`, `surface` (`tray_widget`, `detail`, `settings_window`) | D7 |

**Battery state rule:** charging state and battery level are separate dimensions. A device can be `discharging` and `low` at the same time; do not collapse them into one enum. `battery_level_band` is `normal` above 15%, `low` at 6–15%, and `critical` at 0–5%. These bands are a fixed taxonomy; user-configured alert thresholds are separate and must not redefine them. If one poll crosses multiple thresholds, emit one event and set `threshold_crossed` to the most urgent threshold crossed.

### 5.3 Power-saving features (P0)

| Event | Fires when | Properties | Decision |
|---|---|---|---|
| `power_saving_suggestion_shown` | A suggestion is first presented for a device. Not on every re-render. | `suggestion_id`, `suggestion_type` (`turn_off_rgb`, `dim_rgb_50pct`, `enable_sleep_timer`, `lower_polling_rate`, `lower_brightness`), `device_type`, `battery_pct_bucket`, `estimated_gain_hours_bucket`, `surface` (`tray_widget`, `overlay_toast`, `settings_window`) | D2 |
| `power_saving_suggestion_applied` | User applies a suggestion or manually changes a power setting. | `suggestion_id` (when from a suggestion), `alert_id` (when from an alert), `suggestion_type`, `action_type` (same enum), `sleep_timer_mins_bucket` (only for sleep timer), `device_type`, `source` (`suggestion`, `manual`, `auto`), `estimated_gain_hours_bucket`, `surface` (`tray_widget`, `overlay_toast`, `settings_window`) | D2 |
| `power_saving_suggestion_reverted` | User undoes a previously applied power action within 7 days. | `suggestion_id` (when from a suggestion), `suggestion_type`, `action_type`, `reverted_to` (`rgb_on`, `timer_cancelled`, `polling_restored`, `brightness_restored`), `device_type`, `source` (`suggestion`, `manual`, `auto`), `revert_surface` (`tray_widget`, `settings_window`, `hardware_button_sync`), `time_since_applied_bucket`, `battery_pct_bucket` | D2 |

**Suggestion lifecycle rule:** generate one `suggestion_id` when the suggestion is created and keep it for 7 days so late reverts can still join; expire it after that. Emit `power_saving_suggestion_shown` once per ID, not on every widget render. Sleep-timer actions are represented by `power_saving_suggestion_applied` with `action_type=enable_sleep_timer` and `sleep_timer_mins_bucket`; cancellation is `power_saving_suggestion_reverted` with `reverted_to=timer_cancelled`. Do not create a second timer event.

Manual or automatic power changes use the same `_applied`/`_reverted` events with `source=manual`/`auto` and no `suggestion_id`. Acceptance and revert KPIs filter to `source=suggestion`; manual/auto adoption is reported separately. This keeps one event family without inflating acceptance.

### 5.4 Alerts and notifications (P0)

| Event | Fires when | Properties | Decision |
|---|---|---|---|
| `alert_shown` | An alert/overlay/toast becomes visible. | `alert_id`, `alert_type` (`low_battery_15pct`, `critical_battery_5pct`, `end_of_day_plug_in`, `charge_limit_80_reached`, `full_charge_100_reached`, `health_degraded`, `connection_lost`), `device_type`, `battery_pct_bucket`, `connection_type`, `delivery_mode` (`in_game_focus_overlay`, `os_native_toast`, `widget_inline_banner`, `tray_badge`), `is_fullscreen` | D3 |
| `alert_actioned` | User takes a positive action from an alert within 10 minutes. | `alert_id`, `alert_type`, `action_taken` (`mute_rgb_clicked`, `turn_off_rgb_clicked`, `plugged_in_device`, `remind_me_later_clicked`, `open_widget_clicked`, `open_health_clicked`, `charge_to_100_clicked`, `reconnect_clicked`, `unplugged_at_80pct`), `response_time_sec_bucket`, `device_type` | D3, D6, D7 |
| `alert_dismissed` | Alert closes without a positive action, including auto-timeout. | `alert_id`, `alert_type`, `dismiss_method` (`timeout`, `close_button`, `ignore_button`, `swipe_or_esc`), `response_time_sec_bucket` (`lt_10s`, `10s_to_60s`, `1m_to_5m`, `5m_to_10m`, `gt_10m`), `device_type` | D3 |
| `alert_suppressed` | An alert would have shown but was suppressed. | `alert_id`, `alert_type`, `device_type`, `suppression_reason` (`user_dnd_enabled`, `fullscreen_suppression_rule`, `cooldown_active`, `os_notifications_blocked`, `disabled`, `battery_above_threshold`), `is_fullscreen`, `battery_pct_bucket` | D3 |
| `permission_result` | An OS notification, overlay, or HID access permission check resolves. | `permission_type` (`os_notifications`, `overlay_compositor_access`, `linux_udev_hid_access`), `permission_status` (`granted`, `denied`, `not_applicable`, `unsupported`, `error`), `display_server`, `os` | D3, D5 |

**Alert decision rule:** one function decides shown vs suppressed and emits exactly one of the two events with an `alert_id`. Never emit both; never emit `alert_shown` for an alert the user did not see. This makes the suppression rate trustworthy.

**Timeout rule:** transient alerts auto-dismiss at 10 minutes; `timeout` is a dismissal. If an action and the timeout race, the action wins. If an alert is neither actioned nor dismissed within 10 minutes (for example, because the app quit first), it is a **no-response** and is reported separately. Do not drop it from the denominator.

Some alert actions also emit a feature event — for example, "charge to 100" emits `alert_actioned` and `charge_limit_overridden`. They answer different questions (alert usefulness vs charge-limit behavior) and are joined by `alert_id`.

**Permission volume rule:** emit `permission_result` once per `permission_type` per session, or when the status changes. Do not emit it on every device poll.

### 5.5 Settings, reliability, updates (P0)

| Event | Fires when | Properties | Decision |
|---|---|---|---|
| `setting_changed` | A user-facing setting changes. | `setting_key` (see §6), `old_value_bucket`, `new_value_bucket`, `change_surface` (`tray_widget`, `settings_window`, `onboarding`) | D2, D7 |
| `charge_limit_overridden` | A user with the 80% limit enabled overrides it. | `alert_id` (when from an alert), `device_slot_id`, `device_type`, `override_scope` (`single_charge_to_100`, `permanent_disable_at_pause`), `battery_pct_bucket` (standard buckets; see §6), `trigger_surface` (`charge_limit_alert_toast`, `tray_widget_health_panel`, `settings_window`) | D7 |
| `error_occurred` | A tracked component catches an error. Rate-limited to 1 event per `error_code` per session. | `error_code` (`udev_permission_denied`, `hid_read_timeout`, `bluetooth_gatt_unreachable`, `rgb_control_unsupported`, `overlay_render_failed`, `updater_download_failed`, `device_scan_failed`, `tray_init_failed`, `analytics_flush_failed`), `subsystem` (`device_io`, `overlay_ui`, `power_control`, `auto_updater`, `analytics`, `tray`, `ui`), `device_type`, `connection_type`, `is_recoverable` | D5 |
| `app_updated` | First launch on a new version after an update. | `previous_version`, `new_version`, `update_channel` (`stable`, `beta`), `update_mechanism` (`in_app_auto_updater`, `package_manager_external`, `manual_reinstall`), `days_since_release_bucket` | D6 |

**Do not send** a `setting_changed` event for `telemetry_enabled=false` after consent is revoked. Revocation stops all events immediately; that is the correct behavior, even though it means the revoke itself is not measurable unless the optional P1 event is approved.

`charge_limit_80_enabled` is tracked through `setting_changed`; do not add a separate `charge_limit_set` event. Do not emit `setting_changed` for a direct one-click suggestion acceptance unless the user changes the setting independently; that would double-count D2. Emit `setting_changed` on commit, not on every slider drag tick.

### 5.6 P1 events (first update)

Ship P1 events only after v1.0 baseline dashboards are verified and stable.

| Event | Fires when | Key properties | Decision |
|---|---|---|---|
| `app_closed` | App exits cleanly. | `session_duration_sec_bucket`, `exit_source` (`user`, `os_shutdown`, `update`, `unknown`) | D6 |
| `app_crashed` | Crash detected on next launch via the clean-shutdown marker, or reported by the crash handler. | `error_code`, `subsystem`, `duration_sec_bucket`, `recovered` | D5 |
| `onboarding_skipped` | Onboarding is skipped before the end. | `last_step_name` (same values as `step_name`) | D1 |
| `device_scan_completed` | A scan finishes. | `trigger` (`onboarding`, `manual`, `reconnect`), `duration_ms_bucket`, `device_count_bucket`, `result` (`success`, `partial`, `error`) | D1, D5 |
| `device_removed` | User removes a device. | `device_type`, `source` (`user`, `forgotten`) | D5 |
| `device_detail_viewed` | Device detail view opens. | `device_type`, `tab` (`overview`, `health`, `settings`) | D4 |
| `prediction_profile_switched` | User switches gaming/office estimate. | `device_type`, `from_profile`, `to_profile` (`gaming`, `office`, `auto_detect`) | D4 |
| `power_saving_suggestion_dismissed` | User dismisses a suggestion. | `suggestion_id`, `suggestion_type`, `surface`, `time_visible_ms_bucket` | D2 |
| `settings_opened` | Settings opens. | `surface` (`tray_widget`, `settings_window`), `tab` (`general`, `notifications`, `devices`, `health`, `privacy`, `about`) | D4 |
| `update_check_completed` | An update check finishes. | `result` (`available`, `up_to_date`, `error`), `current_version` | D6 |
| `diagnostics_exported` | User exports diagnostics for support. | `reason` (`support`, `bug_report`, `other`) | D5 |
| `quick_control_used` | User clicks a peripheral quick action. | `control_type` (`dpi_cycle`, `mic_mute_toggle`, `custom_action`), `device_type` | D4 |
| `end_of_day_schedule_configured` | User customizes the end-of-day prompt. | `trigger_mode` (`pc_lock_after_hour`, `scheduled_time`, `system_shutdown`), `hour_of_day_bucket` (`17_to_19`, `20_to_22`, `23_plus`) | D3 |
| `reminder_set` | A plug-in reminder is scheduled. | `remind_at_bucket` (`tonight`, `tomorrow_morning`, `custom`), `device_type`, `source` | D3 |
| `telemetry_consent_revoked` | User switches off analytics in Settings. Optional final event, sent only if legal approves; not erasure. | `consent_surface` (`settings_toggle`) | privacy |

### 5.7 P2 / only if the feature exists

- Monetization: `paywall_viewed`, `trial_started`, `purchase_completed`, `subscription_cancelled`. Add only when pricing is live.
- `battery_history_viewed` if a history screen is added. Keep the history data local; do not send time series to analytics.
- `prediction_calibration_completed` if local discharge-curve learning ships. Properties: `device_type`, `connection_type`, `abs_pct_error_bucket` (`lt_5pct`, `5_to_15pct`, `gt_15pct`).
- Feature-flag exposure is captured automatically by PostHog (`$feature_flag_called`); do not create a duplicate event.

### 5.8 Explicitly not tracked

| Not tracked | Why |
|---|---|
| Raw device names, serial numbers, MAC addresses, Bluetooth IDs, USB VID:PID | PII/fingerprinting; device names often contain a person's name. |
| Window titles, process names, game names, file paths | Sensitive context; not needed for battery decisions. |
| Keystrokes, clipboard, screen contents, screenshots | Out of scope and high risk. |
| Session replay in v1 | Could capture device names/settings; revisit only with masking and explicit consent. |
| Exact battery percentage on a schedule | High volume, low decision value. Track state transitions and alerts only. |
| IP address / city-level geo | Not needed. Disable GeoIP and verify `$ip` is absent. |
| Email, name, account ID | No account system; do not collect. |
| `app_uninstalled` | Not reliably capturable on desktop. Infer from inactivity; do not fake it. |
| Heartbeats / per-second telemetry | Volume without decisions. |

---

## 6. Property dictionary

This section lists shared enums, buckets, and setting values. Event tables also define event-specific enums inline (for example, `action_taken`, `tab`, `exit_source`, `protocol_driver`). If a value appears in both places, the event table is authoritative for that event; do not invent a third set of values.

### Enums

| Property | Values |
|---|---|
| `device_type` | `mouse`, `keyboard`, `headset`, `controller`, `other`, `unknown` |
| `connection_type` | `wired_usb`, `bluetooth`, `usb_dongle_2_4ghz`, `unknown` |
| `charging_state` (`from_charging_state`/`to_charging_state`) | `charging`, `discharging`, `full`, `paused_limit`, `unknown` |
| `battery_level_band` | `normal`, `low`, `critical`, `unknown` |
| `alert_type` | `low_battery_15pct`, `critical_battery_5pct`, `end_of_day_plug_in`, `charge_limit_80_reached`, `full_charge_100_reached`, `health_degraded`, `connection_lost` |
| `delivery_mode` | `in_game_focus_overlay`, `os_native_toast`, `widget_inline_banner`, `tray_badge` |
| `dismiss_method` | `timeout`, `close_button`, `ignore_button`, `swipe_or_esc` |
| `suppression_reason` | `user_dnd_enabled`, `fullscreen_suppression_rule`, `cooldown_active`, `os_notifications_blocked`, `disabled`, `battery_above_threshold` |
| `permission_type` | `os_notifications`, `overlay_compositor_access`, `linux_udev_hid_access` |
| `permission_status` | `granted`, `denied`, `not_applicable`, `unsupported`, `error` |
| `suggestion_type` / `action_type` | `turn_off_rgb`, `dim_rgb_50pct`, `enable_sleep_timer`, `lower_polling_rate`, `lower_brightness` |
| `reverted_to` | `rgb_on`, `timer_cancelled`, `polling_restored`, `brightness_restored` |
| `source` | `suggestion`, `manual`, `auto`, `auto_scan`, `manual_add`, `reconnect`, `user`, `forgotten`, `system`, `schedule` |
| `surface` | `onboarding`, `tray_widget`, `overlay_toast`, `settings_window`, `detail`, `notification` |
| `update_mechanism` | `in_app_auto_updater`, `package_manager_external`, `manual_reinstall` |
| `error_code` | `udev_permission_denied`, `hid_read_timeout`, `bluetooth_gatt_unreachable`, `rgb_control_unsupported`, `overlay_render_failed`, `updater_download_failed`, `device_scan_failed`, `tray_init_failed`, `analytics_flush_failed` |
| `subsystem` | `device_io`, `overlay_ui`, `power_control`, `auto_updater`, `analytics`, `tray`, `ui` |
| `launch_trigger` | `user_manual`, `os_autostart`, `post_update_restart`, `tray`, `installer` |
| `install_source` | `website`, `github`, `microsoft_store`, `winget`, `aur`, `flatpak`, `snap`, `apt`, `appimage`, `other`, `unknown` |
| `prediction_profile` | `gaming`, `office`, `auto_detect` |
| `override_scope` | `single_charge_to_100`, `permanent_disable_at_pause` |

### Buckets

| Property | Buckets |
|---|---|
| `battery_pct_bucket` | `0_to_5`, `6_to_10`, `11_to_15`, `16_to_20`, `21_to_40`, `41_to_60`, `61_to_79`, `80_limit`, `81_to_99`, `100` |
| `health_pct_bucket` | `90_to_100`, `80_to_89`, `70_to_79`, `lt_70`, `unknown` |
| `est_gaming_hours_bucket` / `est_office_hours_bucket` | `lt_2h`, `2_to_5h`, `6_to_10h`, `11_to_20h`, `21_to_40h`, `gt_40h`, `not_applicable` |
| `est_charge_mins_left_bucket` | `lt_15m`, `15_to_30m`, `31_to_60m`, `gt_60m`, `not_charging` |
| `estimated_gain_hours_bucket` | `1_to_3h`, `4_to_8h`, `9_to_15h`, `gt_15h`, `not_applicable` |
| `sleep_timer_mins_bucket` | `none`, `1_to_5m`, `6_to_15m`, `16_to_30m`, `gt_30m` |
| `duration_ms_bucket` | `lt_1s`, `1_to_5s`, `5_to_30s`, `30_to_120s`, `2_to_10m`, `gt_10m` |
| `duration_sec_bucket` | `lt_1m`, `1_to_5m`, `5_to_30m`, `30_to_120m`, `2_to_12h`, `gt_12h` |
| `response_time_sec_bucket` | `lt_10s`, `10s_to_60s`, `1m_to_5m`, `5m_to_10m`, `gt_10m` |
| `time_since_applied_bucket` | `lt_10m`, `10m_to_1h`, `1h_to_24h`, `1d_to_7d` |
| `install_age_days_bucket` | `0`, `1_to_7`, `8_to_30`, `31_plus`, `unknown` |
| `time_bucket` | `17_to_19`, `19_to_21`, `21_to_23`, `23_plus` (user local time, computed on device) |
| `device_count_bucket` | `0`, `1`, `2_3`, `4_plus` |
| `days_since_release_bucket` | `0_to_1d`, `2_to_7d`, `8_to_14d`, `gt_14d` |

`lowest_battery_pct_bucket` and `last_known_battery_pct_bucket` use the same buckets as `battery_pct_bucket`. `time_visible_ms_bucket` uses the same boundaries as `duration_ms_bucket`; `session_duration_sec_bucket` uses `duration_sec_bucket`. Do not invent a second set of buckets.

### `setting_changed` value map

`old_value_bucket` and `new_value_bucket` must use the allowed values for the specific `setting_key`. Never send a raw numeric value or free text.

| `setting_key` | Allowed values |
|---|---|
| `charge_limit_80_enabled` | `on`, `off` |
| `sleep_timer_minutes` | `none`, `1_to_5m`, `6_to_15m`, `16_to_30m`, `gt_30m` |
| `rgb_eco_auto_off` | `on`, `off` |
| `in_game_overlay_enabled` | `on`, `off` |
| `end_of_day_prompt_enabled` | `on`, `off` |
| `low_battery_threshold_pct` | `5`, `10`, `15`, `20`, `custom` |
| `launch_at_login` | `on`, `off` |
| `notifications_enabled` | `on`, `off` |
| `overlay_position` | `top_right`, `top_left`, `bottom_right`, `bottom_left` |
| `theme` | `dark`, `light`, `system` |
| `language` | `mn`, `en` |
| `poll_interval` | `5s`, `10s`, `30s`, `60s` |
| `auto_update` | `on`, `off` |
| `tray_icon_style` | `battery`, `icon`, `percent` |
| `dnd` | `on`, `off` |

### Value rules

- `battery_pct_bucket` is sent only on connect, state changes, alerts, and end-of-day prompts. Do not emit it on polls.
- `estimated_gain_hours_bucket` comes from the estimate shown to the user, not a recomputation.
- `time_bucket` is local to the user; compute it on device and send the bucket, not the timezone.
- `install_source_detail` is a controlled campaign code, not user input: lowercase `[a-z0-9-]`, max 32 characters.
- `utm_source`, `utm_medium`, and `utm_campaign` are allowlisted enums; map unknown values to `other`. Never send raw query strings.
- `protocol_driver` is a coarse driver family, not a hardware identifier. Do not add model names or USB IDs.
- `device_slot_id` is ephemeral and local; never derive it from a hardware address.

---

## 7. Key events and joins

Configure these in PostHog as key events for funnels and insights:

| Key event | Used for |
|---|---|
| `device_connected` (first per install) | Activation, device coverage |
| `onboarding_completed` | Onboarding funnel |
| `power_saving_suggestion_applied` | Feature adoption |
| `alert_actioned` | Alert usefulness |

PostHog has no separate "conversion" object; a key event is the event you build funnels and retention insights around. Keep this list short.

**Joins:**

- `alert_id` joins `alert_shown` → `alert_actioned` / `alert_dismissed`.
- `alert_id` also joins `alert_actioned` to feature events emitted from the same alert (`charge_limit_overridden`, `power_saving_suggestion_applied`).
- `suggestion_id` joins `power_saving_suggestion_shown` → `_applied` → `_reverted`.
- `event_id` (PostHog `uuid` / `$insert_id`) deduplicates retries; dedupe is eventual, not immediate.
- Do not join by adjacency or timestamp alone.

---

## 8. KPIs and observation windows

**Rule: every rate divides a numerator and denominator over the same closed window.** Groups still inside their window are pending, not failed. All rates below are among consenting installs; label them that way.

| KPI | Formula | Window / notes |
|---|---|---|
| **Onboarding completion** | `onboarding_completed` within 24h ÷ `onboarding_started` with 24h elapsed | Report `skipped=true` separately. |
| **Onboarding step drop-off** | Installs reaching step N ÷ installs reaching step N−1 | Use `onboarding_step_completed`; `onboarding_started` is step 0. |
| **Activation rate** | Installs with first-ever `device_connected` within 7 days ÷ installs in groups whose 7-day window has closed | Restrict to first-run consenters (`install_age_days_bucket=0`); late consenters are reported separately. Report by `install_source`, `os`. Reinstalls create a new `install_id`; document that. |
| **First insight rate** | Activated installs with first `widget_opened` or `battery_health_viewed` within 7 days ÷ activated installs whose 7-day window closed | Secondary metric; avoids making widget-open the only definition of value. |
| **Time-to-first-device** | p50/p90 of `device_connected.timestamp − app_installed.timestamp` | Among activated installs; by `os`, `connection_type`. |
| **D7 retention** | Activated installs active (≥1 `app_launched`) on days 7–13 ÷ activated installs whose 13-day window closed | Label "active install retention (autostart included)." Secondary engaged retention: ≥1 `widget_opened` or `alert_actioned`. |
| **D30 retention** | Activated installs active on days 28–34 ÷ activated installs whose 34-day window closed | Same. |
| **Suggestion acceptance** | `power_saving_suggestion_applied` with `source=suggestion` within 24h ÷ `power_saving_suggestion_shown` whose 24h window closed | Join on `suggestion_id`. By `suggestion_type`, `surface`. Manual/auto applications are adoption, not acceptance; report them separately. |
| **Suggestion revert** | `power_saving_suggestion_reverted` with `source=suggestion` within 7 days ÷ `power_saving_suggestion_applied` with `source=suggestion` whose 7-day window closed | By `action_type`, `time_since_applied_bucket`. A revert is not automatically a failure. |
| **Alert action rate** | `alert_shown` with matching `alert_actioned` within 10 min ÷ actionable `alert_shown` whose 10-min window closed | Actionable = alert types with at least one action button. Join on `alert_id`. By `alert_type`, `delivery_mode`, `is_fullscreen`. |
| **Alert dismissal rate** | `alert_dismissed` within 10 min ÷ `alert_shown` whose 10-min window closed | Include `timeout`; report `timeout` separately from explicit dismissals. |
| **Alert no-response share** | `alert_shown` with neither `alert_actioned` nor `alert_dismissed` within 10 min ÷ `alert_shown` whose 10-min window closed | Prevents silent timeouts from disappearing from the denominator. |
| **Fullscreen suppression share** | `alert_suppressed` with `reason=fullscreen_suppression_rule` ÷ (`alert_shown` + `alert_suppressed`) for the same period | Only valid if the single alert decision function emits exactly one event. |
| **Charge-limit override rate** | Distinct installs with ≥1 `charge_limit_overridden` **after** a `paused_limit` transition ÷ distinct installs with ≥1 `battery_state_changed.to_charging_state=paused_limit` in the same closed 7-day window | Restrict to devices with `supports_charge_limit=true`. Require the override to follow the pause so the numerator is a subset of the denominator. Report `single_charge_to_100` and `permanent_disable_at_pause` separately. Do not divide event counts by alert counts. |
| **Charge-limit enablement** | Installs whose latest `setting_changed` for `charge_limit_80_enabled` is `on` (or `onboarding_completed.charge_limit_enabled=true`) ÷ installs with a device that `supports_charge_limit=true` | Among activated installs, 30-day window. A later `off` removes the install from the numerator. |
| **Update adoption** | Installs on version N within 14 days of release ÷ installs active in the 7 days before release | Only report after 14 days. By `update_mechanism`, `os`. Use `app_updated` or `app_launched` with `app_version >= target_version`. |
| **Permission grant rate** | `permission_result=granted` ÷ (`granted` + `denied` + `error`) for `permission_type=os_notifications` | Exclude `not_applicable` and `unsupported`; segment by `os`, `display_server`. |
| **Hardware error rate** | Installs with ≥1 `error_occurred` ÷ active installs | Per 7 days; by `error_code`, `subsystem`, `os`, `display_server`. `protocol_driver` lives on `device_connected`; join to the device's last connect if driver segmentation is needed. |
| **Widget engagement** | `widget_opened` per active install per week; share of active installs with ≥1 open | Report p50/p90; do not let a few heavy users dominate the mean. |
| **Health inspection rate** | Installs with ≥1 `battery_health_viewed` ÷ active installs with ≥1 `device_connected.supports_health=true` | Per 30 days; by `device_type`. |
| **Crash-free sessions** | Sessions without a fatal `error_occurred` or `app_crashed` ÷ sessions | P1; use the local clean-shutdown marker. A crash is reported on next launch. |

### Definitions that prevent bad math

- **Sessions:** `app_launched` starts a session; `app_closed` ends it. If the next launch finds the previous session was not cleanly closed, mark the previous session as crashed. Do not report session metrics in v1 until `app_closed`/`app_crashed` ship.
- **Alert denominator:** only alerts that were actually shown and whose 10-minute window has fully elapsed. Suppressed alerts are excluded from the action-rate denominator and reported separately. Timeouts count as dismissals; no-response is separate.
- **Suggestion denominator:** only suggestions whose 24-hour window has fully elapsed. A suggestion shown 2 hours ago is pending.
- **Retention activity:** `app_launched` counts startup launches. If you want "engaged retention", run a second version using `widget_opened` or `alert_actioned` and label it clearly.
- **Time zone:** window boundaries use UTC; `time_bucket` for end-of-day prompts is computed in the user's local time on device. Do not mix them.
- **Analysis groups are not PostHog cohorts:** because events are anonymous, PostHog person cohorts are unavailable. Compute install-week groups in SQL or retention insights and label them as analysis groups.

---

## 9. Privacy, consent, and data governance

### Consent

- **Opt-in at first run.** Analytics is off until the user grants consent. No events are buffered or sent before consent.
- The app works fully when analytics is declined. Offer "Enable anonymous analytics" later in Settings → Privacy.
- Show what is collected, why, and the retention period in plain language, with a link to the privacy policy.
- Store the consent decision and `consent_version` locally. On revoke, stop sending immediately and clear the local queue.
- Provide "Reset analytics ID" in Settings → Privacy. This breaks linkage to past events without requiring a support request.
- If legal approves a final revocation event, send `telemetry_consent_revoked` once with the old `install_id`, then delete the local ID and stop. Do not call this erasure; see below.

Example consent copy (review with counsel):

> Send anonymous usage data to help us fix device detection and improve battery estimates. We collect a random install ID, event names, app/OS version, device category, and connection type. We never collect device names, serial numbers, browsing activity, or file paths. You can turn this off anytime in Settings → Privacy.

### Data collected vs never collected

| Collected | Never collected |
|---|---|
| Random `install_id`, `session_id` | Name, email, account ID, IP address, location |
| Event names, enum properties, buckets | Device serial, MAC address, Bluetooth ID, USB VID:PID |
| App version, OS, architecture, locale | Raw device name (often contains a person's name) |
| Coarse device category and connection type | Window titles, process names, game names, file paths |
| Error codes and components | Stack traces with user paths, screenshots, screen contents |

### IP and GeoIP

- PostHog JS: set `ip: false`.
- PostHog Node: `disableGeoip: true` (the default in current versions). This stops GeoIP enrichment but does **not** by itself guarantee the ingestion layer discards the request IP.
- Enable **Settings → Project → IP data capture configuration → Discard client IP data**. Verify in staging that `$ip` is absent from stored events.
- If the ingestion layer still records IP, add an IP-anonymization transformation or self-host with IP stripping.

### Retention and deletion

- Set project retention to **12 months** for v1. PostHog Free is 1 year; paid plans default to 2 years as of November 5, 2026. See [PostHog events retention](https://posthog.com/docs/data/events-retention).
- PostHog may delete expired events in batches, not immediately. Do not promise immediate deletion at the retention boundary.
- Local reset: "Reset analytics ID" deletes the local `install_id` and clears the queue.
- Server-side erasure: anonymous events have no person profile, so the Persons deletion path does not apply. Use PostHog's [data deletion API](https://posthog.com/docs/api/data-deletion-requests) with a HogQL query that selects the event UUIDs for the `install_id`, or file a support request. Verify the request and confirm within 30 days.
- `telemetry_consent_revoked` only stops collection; it does not delete past events. Keep the two processes separate in the privacy policy.
- Do not send analytics data to ad platforms or sell it.

### Legal

- EU/UK users: GDPR/UK GDPR consent and data-subject rights apply. Sign a DPA with the processor; prefer EU hosting.
- Mongolia: the Law on Personal Information Protection (2021) may apply. Have counsel review the consent text and retention policy.
- This section is a product requirement, not legal advice.

### Security

- The PostHog project token (`phc_...`) is public and write-only; it is expected to ship in the client. Never ship a personal API key (`phx_...`).
- Restrict project access to the product/engineering team.
- Monitor for abnormal event volume or unexpected event names; the public token can be abused to send spam events.

---

## 10. Implementation notes

### Electron (recommended architecture)

Use [`posthog-node`](https://posthog.com/docs/libraries/node) in the **main process** as the single analytics client. The renderer should not initialize a second client, or events will duplicate and background/tray events will be missed.

```ts
import { PostHog } from 'posthog-node'
import { randomUUID } from 'node:crypto'

const posthog = new PostHog(POSTHOG_PROJECT_TOKEN, { // injected at build time; phc_ tokens are public
  host: 'https://eu.i.posthog.com',
  isServer: false,        // desktop app, not a server
  disableGeoip: true,     // no location from IP
  flushAt: 20,
  flushInterval: 10_000,
  maxQueueSize: 5_000,
  requestTimeout: 8_000,
})

export function track(event: string, properties: Record<string, unknown>) {
  if (!consented || !installId) return // strict no-op before consent
  posthog.capture({
    distinctId: installId,       // random install_id, never a hardware ID
    event,
    uuid: randomUUID(),          // event_id; dedupe key, eventually collapsed
    timestamp: new Date(),       // occurred_at; server received_at is authoritative
    properties: {
      ...superProperties,
      ...properties,
      $process_person_profile: false, // anonymous event, no person profile
      $geoip_disable: true,
    },
  })
}

// On clean exit:
await posthog.shutdown(5_000)
```

- Inject the `phc_` project token at build time. Do not read it from an environment variable at runtime; packaged desktop apps rarely have one.
- Expose `analytics.track(event, properties)` to the renderer through a narrow `contextBridge` API. Validate event names and enum values in the main process.
- On quit, `await posthog.shutdown(5_000)` inside a timeout; never block quit indefinitely.
- On revoke, clear the queue and stop the client. If legal approves the optional final event, use `captureImmediate` with a short timeout, then delete the local ID.
- Use PostHog feature flags only if you need staged rollout; cache values locally and default to off when offline.
- `maxQueueSize` drops the oldest events when full; document that offline events can be lost on quit.

### Native (C++ / Rust / C#)

- Send batches to the PostHog capture API (`/batch/`) with `api_key`, `batch[]`, `event`, `timestamp`, and `properties`. Include `distinct_id`, `uuid` (or `$insert_id`), and `$process_person_profile: false`.
- Persist the queue in SQLite or an append-only file. Cap at 5,000 events; drop oldest first. Flush on network availability, app start, and clean exit.
- Exponential backoff (1s, 2s, 4s, … max 5 min) with jitter.
- Store `install_id` in the app's config directory with user-only permissions. Do not tie it to a hardware fingerprint.

### Schema and validation

- Define a typed event map (TypeScript union or a JSON schema) with required properties and enum values.
- In debug builds, reject unknown event names/properties and log the payload locally. In release, drop invalid events rather than sending garbage.
- Add a CI test that validates the event catalog against this document and scans payload fixtures for emails, IPs, file paths, and long free-text strings.
- Generate the catalog from one source of truth; do not hand-maintain three lists.

### Reliability details

- **Dedupe:** `uuid` / `$insert_id` = `event_id`. Dedupe is eventual; verify duplicates collapse in staging, but do not rely on immediate dedupe.
- **Offline:** queue in memory (or on disk for native); flush on reconnect; never block the UI. Test a 24-hour offline period. Document the loss window on quit.
- **Clock skew:** use monotonic time for durations; clamp negative values to 0; cap durations at 24 hours. Use server `received_at` for analysis windows.
- **Ordering:** do not assume event arrival order. Join on `alert_id` / `suggestion_id`, not adjacency.
- **Sampling:** do not sample P0 events. If `widget_opened` volume exceeds the budget, sample it at 50% and mark `sampled=true`; never sample activation, alerts, power actions, or errors.
- **Environments:** separate PostHog projects for dev and production, or at minimum a `build_channel` filter on every insight. Never send dev events to the production project.

### PostHog configuration checklist

- [ ] Disable autocapture, session replay, heatmaps, surveys, and console log capture.
- [ ] Set `ip: false` (JS) / `disableGeoip: true` (Node). Enable **Discard client IP data** in project settings; verify `$ip` is absent from stored events.
- [ ] Set `$process_person_profile: false` on every event; verify no person profiles are created.
- [ ] Set project retention to 12 months.
- [ ] Create key events: `device_connected`, `onboarding_completed`, `power_saving_suggestion_applied`, `alert_actioned`.
- [ ] Create the dashboards in §12.
- [ ] Restrict project access to the product/engineering team.
- [ ] Sign the DPA; confirm EU hosting if required.
- [ ] Document that PostHog cohorts/lifecycle insights are unavailable in anonymous mode; use retention and install-week analysis groups.

---

## 11. QA and validation checklist

Run this before every release that changes instrumentation:

- [ ] **Pre-consent silence:** launch on a clean VM with Wireshark/mitmproxy. Verify zero outbound packets to `eu.i.posthog.com` and no `install_id` written to disk while the consent modal is open or declined.
- [ ] **Consent ordering:** click "Enable anonymous analytics". Verify `telemetry_consent_granted` is the first event, followed by `app_installed`, `app_launched`, and `onboarding_started`.
- [ ] **PII and hardware scrubber:** connect a Bluetooth headset and a 2.4 GHz mouse. Inspect outgoing JSON and confirm zero device model names, MAC addresses, serials, USB VID:PID, usernames, window titles, file paths, or IP addresses.
- [ ] **Anonymous event check:** confirm `$process_person_profile: false` is present and no person profile appears in PostHog. Confirm retention/funnel insights work; confirm cohort creation is unavailable (expected).
- [ ] **IP discard:** confirm **Discard client IP data** is enabled and `$ip` is absent from stored events in PostHog, not just from the outgoing payload.
- [ ] **Debounce and polling silence:** let the app discharge from 78% to 65%. Confirm zero `battery_state_changed` events during normal non-threshold ticks.
- [ ] **Battery state dimensions:** cross 15% while discharging. Confirm `from_charging_state=discharging`, `to_charging_state=discharging`, `battery_level_band=low`, `threshold_crossed=15`. Confirm the event does not pretend the device stopped discharging.
- [ ] **Join ID integrity:** trigger a low-battery toast (`alert_shown`), click an action (`alert_actioned`), and confirm both share `alert_id`. Apply a suggestion, restart two days later, revert, and confirm `power_saving_suggestion_reverted` carries the persisted `suggestion_id`.
- [ ] **Alert timeout:** leave a low-battery alert untouched until it auto-dismisses at 10 minutes. Confirm `alert_dismissed` with `dismiss_method=timeout` and `response_time_sec_bucket=5m_to_10m` (boundary inclusive); confirm the alert is not counted as actioned.
- [ ] **Charge-limit denominator:** enable the 80% limit, charge to the pause, override once. Confirm the KPI denominator is installs with a `paused_limit` transition, not `alert_shown` count.
- [ ] **Consent revoked:** capture stops immediately; queue is cleared; no further requests. If the optional final event is enabled, confirm it is sent once and the local ID is deleted.
- [ ] **Late consent / re-opt-in:** install, decline, enable analytics a week later. Confirm `install_age_days_bucket=8_to_30` (or `unknown`) and no false day-0 activation. Revoke and re-enable; confirm `is_reopt_in=true` and no second `app_installed`.
- [ ] **Offline for 24 hours:** events queue, then flush once on reconnect; no duplicates.
- [ ] **Quit during a queue:** either flushed or documented loss window; next launch does not duplicate.
- [ ] **Tray/window reopen** does not re-fire `app_launched` or `widget_opened` without a real open.
- [ ] **Multi-device:** `device_type` is correct; no device names/serials in payloads.
- [ ] **Fullscreen:** `alert_suppressed` fires instead of `alert_shown`; no overlay is visible.
- [ ] **Windows toast denied:** `permission_result=denied`; tray fallback works.
- [ ] **Linux Wayland/X11:** `display_server` is correct; tray/notification behavior is noted in the test log.
- [ ] **Update:** `app_updated` has correct `previous_version`/`new_version`.
- [ ] **Volume:** events per active install per day is within the budget in §14.
- [ ] **Dashboards** match the definitions in §8; no metric uses an open-ended window.

---

## 12. Dashboards and decision rules

### Dashboards

| Dashboard | Contents | Cadence |
|---|---|---|
| Activation | Consent → onboarding steps → first device → first widget/health view; by `install_source`, `os`; step drop-off | Weekly |
| Engagement and retention | WAU/MAU, D7/D30 analysis groups, widget opens per active install, devices per install | Weekly / monthly |
| Power features | Suggestion shown → applied → reverted; RGB, sleep timer, polling; by `device_type`, `surface` | Weekly |
| Alerts | Shown → actioned/dismissed/timeout/suppressed; by `alert_type`, `delivery_mode`, `is_fullscreen`; permission grants | Weekly |
| Health and charging | Charging state transitions, 80% limit enablement/override, health views | Monthly |
| Reliability and updates | Errors by component/version/OS/display server; crash-free sessions (P1); update adoption | Weekly |

**Review ritual:** 30 minutes weekly, one page, decisions only. For every metric that moved, write: hypothesis → metric → threshold → action → owner. Keep the log in `docs/analytics/decisions.md` (create it when the first review happens).

### Decision rules (starting thresholds, not truths)

| Decision | Signal | Action |
|---|---|---|
| D1 | Activation <40% after 4 weeks | Fix onboarding/device scan before adding features. |
| D1 / D5 | Linux `device_connected` <60% while >15% of Linux installs have ≥1 `error_occurred` with `error_code=udev_permission_denied` | Add a one-click udev/PolicyKit helper and update package post-install instructions. |
| D2 | RGB-off acceptance <15% on tray, or revert >25% within 7 days | Replace permanent RGB-off with a smart rule (only below 30% battery or when idle >5 min). |
| D3 | End-of-day dismissal >50% and action <15% | Trigger only when battery is ≤20%, not on every PC lock. |
| D3 / D5 | `overlay_render_failed` on Wayland >10% of sessions | Fall back to `os_native_toast` with low urgency. |
| D4 | Widget opens <1 per active install per week | The widget is not delivering value; investigate before adding tabs. |
| D6 | D30 retention <15% | Invest in the core monitor/alert loop, not new features. |
| D7 | `permanent_disable_at_pause` >30% within 7 days of enabling the limit | Make "Charge to 100% once" the primary button; revisit the explanation. |
| Reliability | Crash-free sessions <99% (P1) | Reliability work takes priority over new events. |
| Volume | >12 events per active install per day for a week | Reduce, dedupe, or sample non-critical events. |

---

## 13. Acquisition and UTM mapping for a desktop app

UTM parameters do not survive an installer. Treat the download site and the app as two measurement systems, then connect them with `install_source`.

### Website / download page UTMs

Use lowercase, hyphens, one spelling per source, and no PII. Test the final URL before shipping.

| Channel | `utm_source` | `utm_medium` | `utm_campaign` | `utm_content` |
|---|---|---|---|---|
| Product Hunt | `producthunt` | `launch` | `battery-app-launch-2026-11` | `gallery` |
| X / Twitter | `x` | `social` | `battery-app-launch-2026-11` | `launch-post` |
| LinkedIn | `linkedin` | `social` | `battery-app-launch-2026-11` | `founder-post` |
| Newsletter partner | `newsletter` | `newsletter` | `partner-2026-11` | `header` |
| YouTube creator | `youtube` | `creator` | `creator-code` | `video-id` |
| GitHub | `github` | `referral` | `repo-readme` | `readme-badge` |
| Reddit | `reddit` | `community` | `launch-2026-11` | `post` |
| Discord | `discord` | `community` | `launch-2026-11` | `announcement` |

Allowlist `utm_source` to: `producthunt`, `x`, `linkedin`, `youtube`, `github`, `reddit`, `discord`, `newsletter`, `search`, `direct`, `other`. Allowlist `utm_medium` to: `launch`, `social`, `creator`, `newsletter`, `referral`, `community`, `search`, `other`. Map unknown values to `other`; never ingest raw query strings.

### Installer handoff

Map the download source into the app:

| Download path | `install_source` |
|---|---|
| Website download | `website` |
| GitHub Releases | `github` |
| Microsoft Store | `microsoft_store` |
| winget | `winget` |
| AUR | `aur` |
| Flatpak | `flatpak` |
| Snap | `snap` |
| apt / deb / rpm | `apt` |
| AppImage | `appimage` |

For campaign detail, put a short code in the download URL (e.g. `?ref=ph-launch`) and pass it into installer metadata or a sidecar config file. The app reads it once and stores `install_source_detail`. If that is not feasible, add one optional, skippable "How did you hear about us?" enum on the welcome step and label it self-reported.

`utm_source`, `utm_medium`, and `utm_campaign` on `app_installed` are populated only when the installer or sidecar passes them through. Otherwise omit them and rely on `install_source` / `install_source_detail`.

### Limitations

- Store and package-manager installs have their own acquisition reports; do not expect campaign-level data in-app.
- Direct downloads and AI-assistant referrals often arrive as `website`/`unknown`; treat website analytics as a floor, not the full picture.
- Never put emails, names, or user IDs in a UTM.

---

## 14. Event volume budget

Counts are per active install per day; they are estimates to size the plan, not promises.

| Event group | Events/day (typical) | Notes |
|---|---|---|
| Lifecycle and session (`app_launched`, `app_updated`) | 1.2 | Startup plus manual launches; `app_launched` fires on process start, not OS wake. |
| Device connectivity (`device_connected`, `device_disconnected`) | 2.4 | Two wireless peripherals connecting at boot and disconnecting on shutdown/idle sleep; **no disconnect event on clean app exit**. |
| Battery state transitions (`battery_state_changed`) | 1.5 | Charging transitions and threshold crossings only. |
| Widget and health (`widget_opened`, `battery_health_viewed`) | 1.0 | Users glance at the tray icon passively and open the widget about once a day. |
| Alerts and power suggestions | 1.0 | Low-battery/end-of-day alerts and suggestion lifecycle; average ≤1 cycle/day. |
| Settings, overrides, errors | 0.3 | Occasional changes; errors capped at 1 per code per session. |
| **Total** | **~7.4/day** | **Ceiling: ≤10/day; alert if >12/day for a week.** |

At 10 events/day, the 1M free tier covers ~3,300 DAU. At the expected 7.4/day, it covers ~4,500 DAU. At 10,000 DAU × 7.4/day × 30, that is ~2.22M events/month, or ~$58/month at current anonymous-event rates. At 3M events/month, ~$84/month. Verify pricing before budgeting; identified events cost more.

If you emit `device_disconnected` on clean app exit, add ~2.4 events/day and re-budget. The plan deliberately does not.

---

## 15. Open questions and assumptions

### Open questions

1. **Stack:** Electron, Tauri, Qt/.NET, or Rust native? This determines the SDK and the IPC design.
2. **Backend:** Is there a server, or should analytics go directly from the app to PostHog? Self-host or cloud?
3. **Monetization:** Free, paid, or Pro? If paid, add the P2 purchase events before launch.
4. **Distribution:** Website, GitHub, Microsoft Store, winget, AUR, Flatpak, Snap? This drives `install_source` and update telemetry.
5. **Consent model:** Opt-in everywhere, or opt-out in some regions? Legal review needed for EU/UK and Mongolia.
6. **Crash reporting:** Is PostHog error tracking enough, or is Sentry already in the stack? Do not duplicate.
7. **Linux support level:** Wayland vs X11, tray availability, notification daemon differences. `display_server` and `distro` are included to diagnose this.
8. **Battery history:** Is a per-device history screen planned? Keep that data local; do not send time series to analytics.
9. **Languages:** Mongolian and English at launch? `locale` is captured; event names stay English.
10. **Prediction accuracy:** Do we need to measure whether the "8h gaming / 24h office" estimate is accurate, or only whether the feature is used? Accuracy requires local estimate-vs-actual tracking and is P2.
11. **Ownership:** Who reviews the dashboards weekly, and who owns the decision log?
12. **Identified vs anonymous events:** Are PostHog cohorts/lifecycle insights worth the person-profile cost, or are install-week analysis groups sufficient? This plan assumes anonymous.
13. **Retention period:** the plan assumes **12 months** (free tier). Confirm legal/budget approval before launch; paid plans default to 2 years. State the chosen period in the privacy policy.

### Assumptions

- One install can manage multiple peripherals.
- Anonymous install-level analytics is sufficient; there are no user accounts.
- The app runs in the background/tray, so a "session" is a process lifetime.
- PostHog Cloud EU is acceptable; otherwise self-host.
- No session replay, autocapture, or ad-platform integration in v1.
- The 80% charge limit is available only on devices that support it; the plan segments by `supports_charge_limit`.

---

## Appendix A — Example payloads

### Install and activation

```json
{
  "event": "app_installed",
  "distinct_id": "a91e7c1d-4b2f-4f7e-9c1a-2d8e6b0f3a11",
  "uuid": "0b6f3d2a-8c4e-4a1b-9f7d-5e2c1a0b9d33",
  "timestamp": "2026-11-13T09:18:42Z",
  "properties": {
    "$process_person_profile": false,
    "$geoip_disable": true,
    "install_source": "website",
    "install_source_detail": "ph-launch",
    "install_age_days_bucket": "0",
    "utm_source": "producthunt",
    "utm_medium": "launch",
    "utm_campaign": "battery-app-launch-2026-11",
    "app_version": "1.0.0",
    "os": "windows",
    "os_version_bucket": "win_11",
    "arch": "x64",
    "locale": "mn",
    "display_server": "win32"
  }
}
```

### Suggestion lifecycle

```json
[
  {
    "event": "power_saving_suggestion_shown",
    "properties": {
      "suggestion_id": "3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
      "suggestion_type": "turn_off_rgb",
      "device_type": "keyboard",
      "battery_pct_bucket": "61_to_79",
      "estimated_gain_hours_bucket": "9_to_15h",
      "surface": "tray_widget"
    }
  },
  {
    "event": "power_saving_suggestion_applied",
    "properties": {
      "suggestion_id": "3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
      "suggestion_type": "turn_off_rgb",
      "action_type": "turn_off_rgb",
      "device_type": "keyboard",
      "source": "suggestion",
      "estimated_gain_hours_bucket": "9_to_15h",
      "surface": "tray_widget"
    }
  },
  {
    "event": "power_saving_suggestion_reverted",
    "properties": {
      "suggestion_id": "3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
      "suggestion_type": "turn_off_rgb",
      "action_type": "turn_off_rgb",
      "reverted_to": "rgb_on",
      "device_type": "keyboard",
      "revert_surface": "tray_widget",
      "time_since_applied_bucket": "1d_to_7d",
      "battery_pct_bucket": "41_to_60"
    }
  }
]
```

### Alert shown, actioned, and timed out

```json
[
  {
    "event": "alert_shown",
    "properties": {
      "alert_id": "7f8c2b10-91a4-4e2b-8c3d-112233445566",
      "alert_type": "low_battery_15pct",
      "device_type": "headset",
      "battery_pct_bucket": "11_to_15",
      "connection_type": "bluetooth",
      "delivery_mode": "in_game_focus_overlay",
      "is_fullscreen": true
    }
  },
  {
    "event": "alert_actioned",
    "properties": {
      "alert_id": "7f8c2b10-91a4-4e2b-8c3d-112233445566",
      "alert_type": "low_battery_15pct",
      "action_taken": "plugged_in_device",
      "response_time_sec_bucket": "lt_10s",
      "device_type": "headset"
    }
  }
]
```

A separate timeout example:

```json
{
  "event": "alert_dismissed",
  "properties": {
    "alert_id": "9a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d",
    "alert_type": "end_of_day_plug_in",
    "dismiss_method": "timeout",
    "response_time_sec_bucket": "5m_to_10m",
    "device_type": "headset"
  }
}
```

### Battery state change (two dimensions)

```json
{
  "event": "battery_state_changed",
  "properties": {
    "device_slot_id": "slot_2",
    "device_type": "mouse",
    "connection_type": "usb_dongle_2_4ghz",
    "from_charging_state": "discharging",
    "to_charging_state": "discharging",
    "battery_level_band": "low",
    "threshold_crossed": "15",
    "battery_pct_bucket": "11_to_15",
    "est_gaming_hours_bucket": "2_to_5h",
    "est_office_hours_bucket": "6_to_10h",
    "est_charge_mins_left_bucket": "not_charging"
  }
}
```

### Charge-limit override

```json
{
  "event": "charge_limit_overridden",
  "properties": {
    "alert_id": "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
    "device_slot_id": "slot_1",
    "device_type": "headset",
    "override_scope": "single_charge_to_100",
    "battery_pct_bucket": "80_limit",
    "trigger_surface": "charge_limit_alert_toast"
  }
}
```

---

## Appendix B — Pre-launch instrumentation checklist

- [ ] Event catalog generated from one typed source of truth.
- [ ] `install_id` is random, local, resettable, and never hardware-derived.
- [ ] Consent gate verified: no network calls before grant; no calls after revoke.
- [ ] `uuid` / `$insert_id` dedupe tested; eventual dedupe understood.
- [ ] Offline queue and clean-exit flush tested.
- [ ] Alert decision function emits exactly one of shown/suppressed.
- [ ] `alert_dismissed` includes `timeout`; no-response is reported separately.
- [ ] Suggestion IDs join shown/applied/reverted.
- [ ] `battery_state_changed` separates charging state from battery level.
- [ ] PII scan passes in CI.
- [ ] Staging events verified in PostHog; no person profiles created.
- [ ] Dashboards built and definitions match §8.
- [ ] PostHog cohorts/lifecycle limitation documented; install-week analysis groups used instead.
- [ ] Privacy policy link and consent text reviewed.
- [ ] Retention and deletion process documented.
- [ ] Event volume within budget for the first week.
