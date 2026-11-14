# Peripheral Battery Desktop Utility — Product Analytics Tracking Plan (v1.0)

## Товч хураангуй (Mongolian Summary)

Энэхүү баримт бичиг нь Windows болон Linux үйлдлийн системд зориулсан дагалдах хэрэгслийн (утасгүй хулгана, гар, чихэвч) цэнэг хянах болон ухаалаг эрчим хүч хэмнэх десктоп программын **Бүтээгдэхүүний аналитикийн төлөвлөгөө (Tracking Plan)** юм. Дизайны v1 болон v2 хувилбаруудад тусгагдсан үндсэн боломжууд болох **Цагийн баримжаа (Predictive Lifespan: Тоглоход 8 цаг / Ажиллахад 24 цаг)**, **1 товчоор RGB унтраах (+12 цаг) ба Унтах горимын таймер (Sleep Mode Timer)**, **Холболтын төлөв (2.4GHz USB Dongle, Bluetooth, Утастай) болон Батарейн эрүүл мэнд (80% хязгаар)**, **Тоглоом/ажил таслахгүй контекст мэдэгдэл (Interrupt-Free Overlay Toast)**, **Өдрийн төгсгөлийн цэнэглэх сануулга (End-of-Day Routine Prompt)** зэрэг функцүүдийн бодит үр өгөөжийг хэмжих зорилготой.

Хэрэглэгчийн хувийн мэдээллийг чанд хамгаалах үүднээс анх ажиллуулахад зөвшөөрөл авах (**Opt-in Consent**) загварыг ашиглах бөгөөд зөвшөөрөл өгөхөөс өмнө ямар ч өгөгдөл хадгалахгүй, илгээхгүй. Төхөөрөмжийн серийн дугаар, MAC хаяг, Bluetooth ID, нээлттэй цонх болон тоглоомын нэр, IP хаяг зэргийг цуглуулахгүй. Аналитикийн үндсэн хэрэгслээр **[PostHog Cloud EU (Frankfurt)](https://posthog.com/blog/posthog-cloud-eu)** (эсвэл өөрсдийн сервер дээр суулгах Self-hosted PostHog) сонгосон нь нууцалсан тогтмол суулгалтын дугаар (`install_id`) ашиглан идэвхжил (Activation), D7/D30 хадгалалт (Retention), болон хувилбар шинэчлэлтийг бодитоор хэмжих боломжийг олгоно. Эхний хувилбарт (v1 / P0) шийдвэр гаргалтад (D1–D7) шууд нөлөөлөх **22 эвент** тодорхойлсон бөгөөд нэг идэвхтэй суулгалтаас өдөрт дунджаар **≤10 эвент** илгээхээр тооцоолсон болно.

## 1. Executive Summary & Tool Recommendation

### 1.1 Primary Recommendation: PostHog Cloud EU (Frankfurt)

Use **[PostHog Cloud EU](https://posthog.com/blog/posthog-cloud-eu)** (hosted in AWS `eu-central-1` in Frankfurt, Germany, with [GDPR Data Processing Agreements](https://posthog.com/docs/privacy/gdpr-compliance)) as the single product analytics platform for the Windows and Linux peripheral battery utility. If strict regional or organizational data residency rules prohibit third-party cloud sub-processors, deploy self-hosted PostHog under the MIT license.

Why **[PostHog Product Analytics](https://posthog.com/product-analytics/pricing)** wins for this desktop utility:
1. **Persistent Pseudonymous `install_id` Support**: Measuring 7-day activation (D1), 7-day power-saving suggestion reverts (D2), D7/D30 retention (D6), and 14-day update adoption (D6) requires linking events across app restarts using a client-generated random UUID (`install_id`). [Aptabase](https://aptabase.com/legal/privacy) rotates session identifiers daily and deliberately forbids persistent device or install IDs, making multi-day funnels and cohort retention impossible.
2. **Anonymous Event Cost Efficiency**: Using [`posthog-node`](https://posthog.com/docs/libraries/node) with `$process_person_profile: false` keeps events anonymous while preserving `distinct_id = install_id` for funnel and retention queries, avoiding person-profile billing overhead on [PostHog's pricing model](https://posthog.com/docs/billing/what-you-pay-for-per-event).
3. **Generous Free Tier & Predictable Scaling**: [PostHog Product Analytics](https://posthog.com/docs/product-analytics/pricing) includes **1,000,000 free events per month** with 1-year data retention, scaling at usage-based rates above 1M events/month. At our target budget of `≤10` events per active install per day, the free tier covers ~3,300 daily active consenting installs (~1M events/month), while 10,000 daily active consenting installs (~3M events/month) requires a modest paid tier or self-hosted instance.
4. **Desktop Runtime Control**: [`posthog-node`](https://posthog.com/docs/references/posthog-node) runs cleanly inside an Electron main process (or via direct HTTPS batch calls from a native Rust/Tauri/C++ daemon) with [`isServer: false` and `disableGeoip: true`](https://posthog.com/docs/libraries/node), stripping IP geolocation before storage.

### 1.2 Analytics Tool Comparison Matrix

| Evaluation Criterion | [PostHog Cloud EU](https://posthog.com/product-analytics/pricing) (Recommended) | [Aptabase](https://aptabase.com/docs) (Strict Fallback) | [Mixpanel](https://mixpanel.com/pricing/) | [Amplitude](https://amplitude.com/pricing) | [Google Analytics 4](https://developers.google.com/analytics/devguides/collection/protocol/ga4) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Persistent Pseudonymous ID (`install_id`)** | Supported (`distinct_id` with `$process_person_profile: false` per [PostHog Node Docs](https://posthog.com/docs/libraries/node)) | Prohibited by design; daily rotating session ID only ([Aptabase Privacy Policy](https://aptabase.com/legal/privacy)) | Supported ([Mixpanel Pricing Docs](https://docs.mixpanel.com/docs/pricing)) | Supported ([Amplitude Pricing](https://amplitude.com/pricing)) | Supported via `client_id`, but [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events) is designed to augment web/Firebase streams |
| **Multi-Day Funnels & D7/D30 Retention** | Full cohort retention, closed-window funnels, and SQL/HogQL access ([PostHog Docs](https://posthog.com/docs/product-analytics/start-here)) | Impossible across restarts/days ([Aptabase App Privacy](https://aptabase.com/docs/apple-app-privacy)) | Full funnels and retention ([Mixpanel Pricing](https://mixpanel.com/pricing/)) | Full funnels and retention ([Amplitude Pricing](https://amplitude.com/pricing)) | Partial reporting when using [Measurement Protocol alone](https://developers.google.com/analytics/devguides/collection/protocol/ga4) without `gtag.js`/Firebase |
| **Free Tier Volume** | 1M events/month free ([PostHog Pricing](https://posthog.com/product-analytics/pricing)) | 20k events/month free; $20/mo for 1M events ([Aptabase Comparison](https://justanalytics.app/blog/aptabase-vs-justanalytics-app-analytics-comparison)) | 1M events/month free ([Mixpanel Pricing](https://mixpanel.com/pricing/)) | 2M events/month free ([Amplitude Pricing](https://amplitude.com/pricing)) | High event volume, but capped at 50 custom dimensions/metrics ([GA4 Limits](https://support.google.com/analytics/answer/12229528?hl=en)) |
| **Cost at 3M Events/Month (10k DAU × 10 ev/day)** | ~$100/month on usage-based tier ([PostHog Pricing](https://posthog.com/docs/product-analytics/pricing)) | ~$45/month ([Aptabase Pricing Breakdown](https://justanalytics.app/blog/aptabase-vs-justanalytics-app-analytics-comparison)) | ~$560/month ($0.28 per 1k overage on [Mixpanel Growth](https://arktis.so/learning-hub/mixpanel-pricing)) | ~$94/month on [Amplitude Plus](https://mitzu.io/post/amplitude-pricing/) | Free, but unsuitable for desktop product telemetry ([GA4 Protocol Docs](https://developers.google.com/analytics/devguides/collection/protocol/ga4)) |
| **Desktop / Electron / Native Ergonomics** | Official [`posthog-node` SDK](https://posthog.com/docs/libraries/node) (`isServer: false`, `disableGeoip: true`) + simple HTTP batch API | Lightweight desktop SDKs (Tauri, Electron, .NET, Flutter, Python per [Aptabase Docs](https://aptabase.com/docs)) | Node SDK targets server workflows; requires manual client batching | Node SDK or HTTP API; heavier enterprise governance overhead | [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference) does not return validation errors on malformed payloads |
| **Self-Hosting Option** | Open-source MIT Docker deployment ([PostHog Privacy Docs](https://posthog.com/docs/privacy/data-storage)) | Open-source self-hosting available ([Aptabase About](https://aptabase.com/about)) | Cloud-only ([Mixpanel Pricing](https://mixpanel.com/pricing/)) | Cloud-only ([Amplitude Pricing](https://amplitude.com/pricing)) | Cloud-only ([GA4 Help](https://support.google.com/analytics/answer/12229528?hl=en)) |

### 1.3 Architecture & Tooling Guardrails

- **Single Analytics Tool Rule**: Do **not** run two product analytics tools simultaneously. Splitting or duplicating telemetry across PostHog and GA4/Aptabase doubles network overhead in a background tray utility and complicates consent disclosures.
- **No GA4 for Desktop Product Telemetry**: Do not use [Google Analytics 4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4) as the primary desktop analytics engine; it relies on web/Firebase session semantics and silently drops or under-reports standalone desktop protocol payloads.
- **Fallback Condition for Aptabase**: Switch to [Aptabase](https://aptabase.com/docs) **only** if legal review explicitly forbids storing a persistent random `install_id` even after first-run opt-in consent. If Aptabase is forced, Decision D6 (D7/D30 retention and 14-day update adoption cohorts) and multi-day revert joins (D2) must be formally dropped from the measurement model.

## 2. Product Context & Measurement Model (Decisions D1–D7)

### 2.1 UX/UI Feature Inventory (Extracted from `design_v1` & `design_v2`)

Our Mongolian UX/UI specifications define six core product value layers over generic OS battery percentage indicators:
1. **Taskbar Tray & Quick-Access Widget (`design_v2` #1 / `design_v1` Fast ID)**: OS taskbar tray icons showing peripheral type (mouse, keyboard, headset), connection state, and quick-control toggles (`DPI`, `Mute`, `Trick`, overflow menu).
2. **Predictive Lifespan (`design_v2` #1 & Center Card / `ux.txt` #1)**: Translates raw battery percentage (e.g., `72%`) into workload-specific remaining hours (`Estimated: 8h Gaming / 24h Office`, or `Charging... 25 min left`, `Discharging 42 hrs left`).
3. **Smart Power Optimizations (`design_v2` Center Card / `design_v1` #3 / `ux.txt` #2)**: One-click `Turn off RGB Lighting (+12 hrs of use)` toggle and an adjustable `Sleep Mode Timer` (minutes of idle time before auto-shutdown).
4. **Contextual Interrupt-Free Overlay Alerts (`design_v2` #2 / `design_v1` #4 / `ux.txt` #4)**: Non-obtrusive `In-Game/Focus Overlay Toast` (`Low Battery Headset (12% Left)`) with inline actions (`Mute RGB (+2hrs)`, `Ignore`) that never minimizes active fullscreen games or video calls.
5. **Connectivity & Battery Health Status (`design_v2` #4 / `design_v1` #2 & #5 / `ux.txt` #3)**: Real-time indicator for `2.4G USB Dongle`, `Bluetooth`, or `Wired (while charging)`, paired with long-term `Battery Health: 92%` monitoring and an **80% degradation charge limit** alert/protection toggle.
6. **End-of-Day Routine Prompt (`design_v2` #5)**: Predictive lock-screen/shutdown reminder (`Locking PC? We suggest plugging in your Headset (15% left) so it's ready tomorrow!`) with a `Remind me` option.

### 2.2 Decision-Driven Measurement Mapping (D1–D7)

Every tracked event must serve at least one of the seven product decisions below. Events that do not inform D1–D7 are excluded from the tracking plan.

| Decision ID | Product Question / Decision | UX Layer Tested | Primary KPIs | Required P0 Events |
| :--- | :--- | :--- | :--- | :--- |
| **D1 — Activation & First-Value Delivery** | Do consenting installs successfully detect a wireless peripheral and view predictive battery status within 7 days? | Onboarding, Device Detection, Tray Widget | Activation Rate (7d), Onboarding Completion Rate (24h), Time-to-First-Device | `telemetry_consent_granted`, `app_installed`, `app_launched`, `onboarding_started`, `onboarding_completed`, `device_connected`, `widget_opened` |
| **D2 — Power-Saving Suggestion Adoption & Reverts** | Do users apply one-click RGB-off (`+12h`) and sleep-mode timer suggestions, or do they revert them within 7 days because the setting is annoying? | Smart Power Optimizations (`Turn off RGB`, `Sleep Mode Timer`) | Suggestion Acceptance Rate (24h), Suggestion Revert Rate (7d) | `power_saving_suggestion_shown`, `power_saving_suggestion_applied`, `power_saving_suggestion_reverted`, `setting_changed` |
| **D3 — Contextual Alert Usefulness vs. Annoyance** | Do fullscreen-safe low-battery and end-of-day prompts drive action (plugging in or muting RGB) within 10 minutes, or get dismissed/disabled? | Contextual Overlay Toast & End-of-Day Prompt | Alert Action Rate (10m), Alert Dismissal Rate (5m), Suppression Ratio | `alert_shown`, `alert_actioned`, `alert_dismissed`, `alert_suppressed`, `battery_state_changed`, `notification_permission_result` |
| **D4 — Predictive Lifespan & Eco-Feature Engagement** | Do users rely on the widget's gaming/office hour estimates and connection-type comparisons (`2.4GHz` vs `Bluetooth`)? | Predictive Usage & Connection Status | Widget Engagement Frequency, Multi-Transport Switch Rate | `widget_opened`, `device_connected`, `device_disconnected`, `battery_state_changed` |
| **D5 — Device Ecosystem & Linux/Windows Parity** | Which peripheral types (`mouse`, `keyboard`, `headset`), connection transports, and OS environments (Windows vs Linux distros/display servers) experience detection or permission failures? | Cross-Platform Hardware Abstraction | Hardware Error Rate, OS/Display-Server Coverage, Permission Grant Rate | `device_connected`, `error_occurred`, `notification_permission_result`, `app_launched` |
| **D6 — Retention & Release Update Health** | Do activated users keep the utility running in their system tray at D7 and D30, and do installs adopt new updates within 14 days? | Core Utility Stickiness & Auto-Updater | D7 Active Retention, D30 Active Retention, Update Adoption Rate (14d) | `app_launched`, `device_connected`, `widget_opened`, `alert_actioned`, `app_updated` |
| **D7 — Battery Health & 80% Charge Limit Utility** | Do users inspect battery degradation health and keep the 80% charge limit enabled, or frequently override it to charge to 100%? | Battery Health (`92%`) & 80% Degradation Limit | Health Inspection Rate, 80% Limit Enablement Rate, Override Frequency | `battery_health_viewed`, `setting_changed`, `charge_limit_overridden`, `alert_actioned` |

## 3. Naming Conventions & Schema Standards

### 3.1 Event Naming Rules

- **Format**: `object_action` in past tense, lowercase `snake_case` (e.g., `device_connected`, `power_saving_suggestion_applied`, `charge_limit_overridden`).
- **Exception**: `notification_permission_result` uses a noun suffix because it records the immediate OS permission outcome returned by the platform API.
- **Strict Enum Typing**: Every string property must validate against a closed enum list or pre-defined bucket format before emission. Free-text strings, raw error stack traces, and raw hardware descriptors are forbidden.

### 3.2 Shared Super Properties (Attached to All Events)

Every event emitted after `telemetry_consent_granted` includes the following global context properties:

| Property Name | Type | Allowed Values / Format | Description |
| :--- | :--- | :--- | :--- |
| `install_id` | `string (UUIDv4)` | Random UUIDv4 generated *after* opt-in consent | Maps to PostHog `distinct_id`. Never derived from MAC address, CPU ID, or OS machine-id. |
| `session_id` | `string (UUIDv4)` | Random UUIDv4 per app launch lifecycle | Rotates on each `app_launched` event. |
| `app_version` | `string (SemVer)` | `0.1.0`, `1.0.0`, etc. | Current application semantic version. |
| `os_name` | `enum` | `windows`, `linux` | Host operating system family. |
| `os_version_bucket` | `enum` | `win_10`, `win_11`, `linux_kernel_6_x`, `linux_kernel_5_x`, `other` | Coarse OS version bucket (no minor build serials). |
| `linux_distro_family` | `enum \| null` | `arch`, `debian_ubuntu`, `fedora_rhel`, `opensuse`, `nixos`, `other`, `null` | Populated only when `os_name = linux`; `null` on Windows. |
| `display_server` | `enum` | `win32`, `wayland`, `x11`, `unknown` | Essential for diagnosing fullscreen overlay behavior on Linux (`wayland` vs `x11`) and Windows. |
| `install_source` | `enum` | `direct_download`, `winget`, `aur`, `flatpak`, `appimage`, `deb_rpm`, `microsoft_store`, `unknown` | Package manager or installer channel. |
| `ui_locale` | `enum` | `mn`, `en`, `other` | Current UI language code. |
| `$process_person_profile` | `boolean` | `false` | PostHog system property ensuring anonymous event processing ([PostHog Node SDK](https://posthog.com/docs/libraries/node)). |

## 4. Event Dictionary (P0, P1, P2)

### 4.1 P0 Events for v1 Launch (22 Events)

All 22 P0 events map directly to Decisions D1–D7. No other events ship in v1.0.

| # | Event Name | Decision | Trigger Condition (When Emitted) | Event-Specific Properties |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `telemetry_consent_granted` | D1 | Emitted immediately when the user explicitly clicks "Accept / Enable Anonymous Telemetry" in the first-run consent dialog or later enables telemetry in Settings. **First event ever sent by an install.** | `consent_surface` (`first_run_modal`, `settings_toggle`), `consent_schema_version` (`v1`) |
| 2 | `app_installed` | D1, D6 | Emitted immediately after `telemetry_consent_granted` on the very first run of a newly installed instance. Never buffered prior to consent. | `install_source`, `is_clean_install` (`boolean`), `utm_source` (`enum \| null`), `utm_medium` (`enum \| null`), `utm_campaign` (`enum \| null`) |
| 3 | `app_launched` | D1, D5, D6 | Emitted once per application process startup (after consent is verified as granted). | `launch_trigger` (`user_manual`, `os_autostart`, `post_update_restart`), `connected_device_count_bucket` (`0`, `1`, `2`, `3_plus`), `start_minimized` (`boolean`) |
| 4 | `onboarding_started` | D1 | Emitted when the first-run setup flow begins (immediately following consent on initial run). | `initial_detected_devices_bucket` (`0`, `1`, `2`, `3_plus`) |
| 5 | `onboarding_completed` | D1 | Emitted when the user finishes the onboarding wizard. | `onboarding_duration_sec_bucket` (`lt_30s`, `30s_to_120s`, `gt_120s`), `devices_paired_count_bucket` (`0`, `1`, `2`, `3_plus`), `autostart_enabled` (`boolean`), `eighty_pct_limit_enabled` (`boolean`) |
| 6 | `device_connected` | D1, D4, D5, D6 | Emitted when a supported peripheral is detected at launch or hot-plugged/woken from sleep (deduplicated against rapid USB/Bluetooth bounce within 30 seconds). | `device_slot_id` (`slot_1`..`slot_8`), `device_type` (`mouse`, `keyboard`, `headset`, `gamepad`, `unknown`), `connection_type` (`usb_dongle_2_4ghz`, `bluetooth`, `wired_usb`), `battery_pct_bucket`, `supports_rgb_control` (`boolean`), `supports_sleep_timer` (`boolean`), `supports_charge_limit` (`boolean`), `protocol_driver` (`hidpp`, `razer_openrazer`, `steelseries_hid`, `standard_ble_bas`, `upower_generic`, `other`) |
| 7 | `device_disconnected` | D4, D5 | Emitted when a connected peripheral disconnects, powers off, enters deep sleep, or loses transport signal for >30 seconds. | `device_slot_id`, `device_type`, `connection_type`, `disconnect_reason` (`idle_sleep`, `unplugged_or_switched_off`, `low_battery_cutoff`, `signal_lost`, `app_shutdown`, `unknown`), `last_known_battery_pct_bucket` |
| 8 | `widget_opened` | D1, D4, D6 | Emitted when the user opens the taskbar tray popup/widget to inspect battery status or predictive usage. | `open_trigger` (`tray_icon_click`, `global_hotkey`, `alert_toast_click`), `active_device_count_bucket` (`0`, `1`, `2`, `3_plus`), `lowest_battery_pct_bucket`, `display_mode_shown` (`predictive_hours_gaming_office`, `percentage_only`) |
| 9 | `battery_state_changed` | D3, D4 | Emitted **only** on discrete state transitions (charging started, charging completed, crossing a major threshold like `20%`, `15%`, `10%`, `5%`, or hitting the `80%` charge limit)—**never** on periodic percentage polling ticks. | `device_slot_id`, `device_type`, `connection_type`, `previous_state` (`discharging`, `charging`, `full`, `charge_limit_paused`, `low`, `critical`), `new_state` (`discharging`, `charging`, `full`, `charge_limit_paused`, `low`, `critical`), `battery_pct_bucket`, `est_gaming_hours_bucket`, `est_office_hours_bucket`, `est_charge_mins_left_bucket` |
| 10 | `battery_health_viewed` | D7 | Emitted when the user opens or expands the long-term Battery Health view (`Health: 92%` / degradation limit panel). | `device_slot_id`, `device_type`, `health_pct_bucket` (`90_to_100`, `80_to_89`, `70_to_79`, `lt_70`, `unknown`), `charge_limit_80_active` (`boolean`) |
| 11 | `power_saving_suggestion_shown` | D2 | Emitted when the widget or overlay displays an actionable power-saving recommendation (e.g., `Turn off RGB (+12h)` or `Sleep Mode Timer` adjustment). Generates a `suggestion_id`. | `suggestion_id` (`UUIDv4`), `suggestion_type` (`turn_off_rgb`, `dim_rgb_50pct`, `enable_sleep_timer`, `lower_polling_rate`), `surface` (`tray_widget`, `overlay_toast`), `device_type`, `battery_pct_bucket`, `est_hours_gained_bucket` (`1_to_3h`, `4_to_8h`, `9_to_15h`, `gt_15h`) |
| 12 | `power_saving_suggestion_applied` | D2 | Emitted when the user clicks or toggles on a power-saving recommendation. Joined via `suggestion_id` (persisted locally for 7 days to detect reverts). | `suggestion_id` (`UUIDv4`), `suggestion_type`, `surface` (`tray_widget`, `overlay_toast`), `device_type`, `battery_pct_bucket`, `est_hours_gained_bucket`, `sleep_timer_mins_bucket` (`none`, `1_to_5m`, `6_to_15m`, `16_to_30m`, `gt_30m`) |
| 13 | `power_saving_suggestion_reverted` | D2 | Emitted when a user manually reverses a previously applied suggestion within **7 days** (e.g., turning RGB back on or setting the sleep timer back to `0`/disabled). | `suggestion_id` (`UUIDv4`), `suggestion_type`, `device_type`, `revert_surface` (`tray_widget`, `settings_panel`, `hardware_button_sync`), `time_since_applied_bucket` (`lt_10m`, `10m_to_1h`, `1h_to_24h`, `1d_to_7d`), `battery_pct_bucket` |
| 14 | `alert_shown` | D3 | Emitted when a contextual notification is displayed (low battery overlay toast, critical battery warning, 80% charge limit reached, or end-of-day lock/shutdown reminder). Generates `alert_id`. | `alert_id` (`UUIDv4`), `alert_type` (`low_battery_15pct`, `critical_battery_5pct`, `end_of_day_plug_in`, `charge_limit_80_reached`, `full_charge_100_reached`), `delivery_mode` (`in_game_focus_overlay`, `os_native_toast`, `widget_inline_banner`), `device_type`, `connection_type`, `battery_pct_bucket`, `fullscreen_app_active` (`boolean`) |
| 15 | `alert_actioned` | D3, D6, D7 | Emitted when the user takes a positive action on a shown alert within 10 minutes (clicks `Mute RGB (+2hrs)`, clicks `Remind me`, or physically plugs in the charging cable after a low-battery/end-of-day prompt). | `alert_id` (`UUIDv4`), `alert_type`, `action_taken` (`mute_rgb_clicked`, `plugged_in_device`, `remind_me_later_clicked`, `open_widget_clicked`, `unplugged_at_80pct`), `response_time_sec_bucket` (`lt_10s`, `10s_to_60s`, `1m_to_5m`, `5m_to_10m`), `device_type` |
| 16 | `alert_dismissed` | D3 | Emitted when the user explicitly clicks `Ignore` or closes the alert without taking the recommended action. | `alert_id` (`UUIDv4`), `alert_type`, `dismiss_method` (`ignore_button`, `close_icon`, `swipe_or_esc`), `response_time_sec_bucket` (`lt_10s`, `10s_to_60s`, `1m_to_5m`), `device_type` |
| 17 | `alert_suppressed` | D3 | Emitted when an alert threshold is triggered, but the app suppresses visual display due to user settings (e.g., Do Not Disturb, fullscreen suppression rule, or cooldown window). | `alert_type`, `suppression_reason` (`user_dnd_enabled`, `fullscreen_suppression_rule`, `cooldown_active`, `os_notifications_blocked`), `device_type`, `battery_pct_bucket` |
| 18 | `notification_permission_result` | D3, D5 | Emitted when the OS notification or overlay permission check completes during onboarding or when toggled in Settings. | `permission_type` (`os_notifications`, `overlay_compositor_access`, `linux_udev_hid_access`), `permission_status` (`granted`, `denied`, `not_applicable`), `display_server` |
| 19 | `setting_changed` | D2, D7 | Emitted when the user modifies a persistent preference in the widget or Settings window (excluding direct one-click suggestion acceptance unless changed independently). | `setting_key` (`charge_limit_80_enabled`, `sleep_timer_minutes`, `rgb_eco_auto_off`, `in_game_overlay_enabled`, `end_of_day_prompt_enabled`, `low_battery_threshold_pct`, `launch_at_login`), `old_value_bucket` (`string enum`), `new_value_bucket` (`string enum`), `change_surface` (`tray_widget`, `settings_window`) |
| 20 | `charge_limit_overridden` | D7 | Emitted when a user with the 80% battery health limit enabled explicitly overrides it (either for a single charge cycle to reach 100% before travel/long gaming, or by disabling the limit while charging is paused at 80%). | `device_slot_id`, `device_type`, `override_scope` (`single_charge_to_100`, `permanent_disable_at_pause`), `battery_pct_bucket` (`76_to_85`, `86_to_100`), `trigger_surface` (`charge_limit_alert_toast`, `tray_widget_health_panel`) |
| 21 | `error_occurred` | D5 | Emitted when a hardware communication, permission, or updater error occurs (rate-limited to at most 1 event per `error_code` per session). | `error_code` (`udev_permission_denied`, `hid_read_timeout`, `bluetooth_gatt_unreachable`, `rgb_control_unsupported`, `overlay_render_failed`, `updater_download_failed`), `subsystem` (`device_io`, `overlay_ui`, `power_control`, `auto_updater`), `device_type` (`enum \| null`), `connection_type` (`enum \| null`), `is_recoverable` (`boolean`) |
| 22 | `app_updated` | D6 | Emitted on the first launch immediately after an application version upgrade completes. | `previous_version` (`SemVer`), `new_version` (`SemVer`), `update_channel` (`stable`, `beta`), `update_mechanism` (`in_app_auto_updater`, `package_manager_external`, `manual_reinstall`), `days_since_release_bucket` (`0_to_1d`, `2_to_7d`, `8_to_14d`, `gt_14d`) |

### 4.2 P1 Events (First Post-Launch Update — v1.1)

Ship P1 events only after v1.0 baseline dashboards are verified and stable:

| Event Name | Decision | Trigger Condition | Key Properties |
| :--- | :--- | :--- | :--- |
| `quick_control_used` | D4 | User clicks peripheral quick-action buttons (`DPI`, `Mute`, `Trick`) at the bottom of the widget (`design_v1` #6). | `control_type` (`dpi_cycle`, `mic_mute_toggle`, `custom_trick_action`), `device_type` |
| `prediction_profile_switched` | D4 | User manually toggles or calibrates between `gaming` and `office` estimation baselines in the widget. | `selected_profile` (`gaming`, `office`, `auto_detect`), `device_type` |
| `end_of_day_schedule_configured` | D3 | User customizes the time window or lock-screen trigger for the `End-of-Day Routine Prompt` (`design_v2` #5). | `trigger_mode` (`pc_lock_after_hour`, `scheduled_time`, `system_shutdown`), `hour_of_day_bucket` (`17_to_19`, `20_to_22`, `23_plus`) |
| `telemetry_consent_revoked` | Privacy | User switches off anonymous telemetry in Settings. Sent as a final standalone payload before wiping local `install_id` and halting the SDK. | `consent_surface` (`settings_toggle`) |

### 4.3 P2 Events (Optional Future Scope — v1.2+)

| Event Name | Purpose | Key Properties |
| :--- | :--- | :--- |
| `prediction_calibration_completed` | Evaluates accuracy of local discharge-curve learning (`8h Gaming / 24h Office`) after 3 full discharge cycles without sending time-series logs. | `device_type`, `connection_type`, `abs_pct_error_bucket` (`lt_5pct`, `5_to_15pct`, `gt_15pct`) |
| `diagnostics_bundle_exported` | Tracks how often users export a local hardware debug file when filing a GitHub/Discord support issue for an unsupported mouse/headset. | `device_type`, `protocol_driver`, `os_name` |

## 5. Property Dictionary & Bucket Definitions

To guarantee low cardinality and zero PII leakage, numeric values are bucketed on the client before serialization:

| Property Name | Data Type | Allowed Enum / Bucket Values | Notes |
| :--- | :--- | :--- | :--- |
| `battery_pct_bucket` / `lowest_battery_pct_bucket` / `last_known_battery_pct_bucket` | `enum` | `0_to_5`, `6_to_10`, `11_to_15`, `16_to_20`, `21_to_40`, `41_to_60`, `61_to_79`, `80_limit`, `81_to_99`, `100` | Aligns with low-battery (`15%`), critical (`5%`), and battery-health limit (`80%`) UX thresholds. |
| `est_gaming_hours_bucket` / `est_office_hours_bucket` | `enum` | `lt_2h`, `2_to_5h`, `6_to_10h`, `11_to_20h`, `21_to_40h`, `gt_40h`, `not_applicable` | Reflects the predictive lifespan display (`8h Gaming / 24h Office`). |
| `est_charge_mins_left_bucket` | `enum` | `lt_15m`, `15_to_30m`, `31_to_60m`, `gt_60m`, `not_charging` | Reflects active charging estimation (`Charging... 25 min left`). |
| `est_hours_gained_bucket` | `enum` | `1_to_3h`, `4_to_8h`, `9_to_15h`, `gt_15h` | Captures predicted gain from eco-actions (e.g., `+12h` for turning off RGB, `+2h` for muting RGB on low headset battery). |
| `sleep_timer_mins_bucket` | `enum` | `none`, `1_to_5m`, `6_to_15m`, `16_to_30m`, `gt_30m` | Captures the idle auto-shutdown timer setting (`Sleep Mode Timer`). |
| `device_slot_id` | `enum` | `slot_1`, `slot_2`, `slot_3`, `slot_4`, `slot_5`, `slot_6`, `slot_7`, `slot_8` | Ephemeral local slot index assigned per install. Never contains USB `VID:PID`, serial numbers, or Bluetooth MACs. |
| `alert_id` | `UUIDv4` | Random UUIDv4 per displayed alert instance | Joins `alert_shown` → `alert_actioned` / `alert_dismissed` within a 10-minute observation window. |
| `suggestion_id` | `UUIDv4` | Random UUIDv4 per power-saving suggestion | Joins `power_saving_suggestion_shown` → `power_saving_suggestion_applied` → `power_saving_suggestion_reverted`. Stored in local app state for **7 days** alongside the applied setting key so late reverts via the widget or settings window attach the original `suggestion_id`. |

## 6. Key Event Joins & Closed-Window KPI Formulas

All conversion, activation, and retention rates apply **closed observation windows** and **exclude pending cohorts** (installs or events whose observation window has not yet fully elapsed at query time). Because telemetry is strictly opt-in with zero pre-consent buffering, **every dashboard title and KPI readout must carry the qualifier: `(Among Consenting Installs)`**.

| KPI Name | Decision | Closed Observation Window | Numerator | Denominator (Excluding Pending Cohorts) | Target / Healthy Benchmark |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Onboarding Completion Rate (24h)** | D1 | `24 hours` from `onboarding_started` | Distinct `install_id` with `onboarding_completed` within 24 hours of `onboarding_started` | Distinct `install_id` with `onboarding_started` where `event_timestamp <= now() - INTERVAL 24 HOUR` | `≥ 85%` |
| **7-Day Activation Rate** | D1 | `7 days` (`168 hours`) from `app_installed` | Distinct `install_id` that fired `app_installed` AND within 7 days fired both `device_connected` (at least 1 wireless peripheral) AND `widget_opened` | Distinct `install_id` with `app_installed` where `event_timestamp <= now() - INTERVAL 7 DAY` | `≥ 70%` |
| **Power-Saving Suggestion Acceptance Rate (24h)** | D2 | `24 hours` from `power_saving_suggestion_shown` | Distinct `suggestion_id` with `power_saving_suggestion_applied` within 24 hours of `power_saving_suggestion_shown` | Distinct `suggestion_id` with `power_saving_suggestion_shown` where `event_timestamp <= now() - INTERVAL 24 HOUR` | `≥ 25%` (Tray Widget), `≥ 40%` (Low-Battery Toast) |
| **Power-Saving Suggestion Revert Rate (7d)** | D2 | `7 days` from `power_saving_suggestion_applied` | Distinct `suggestion_id` with `power_saving_suggestion_reverted` within 7 days of `power_saving_suggestion_applied` | Distinct `suggestion_id` with `power_saving_suggestion_applied` where `event_timestamp <= now() - INTERVAL 7 DAY` | `≤ 15%` (Higher indicates UX friction or aggressive defaults) |
| **Contextual Alert Action Rate (10m)** | D3 | `10 minutes` from `alert_shown` | Distinct `alert_id` with `alert_actioned` within 10 minutes of `alert_shown` | Distinct `alert_id` with `alert_shown` where `event_timestamp <= now() - INTERVAL 10 MINUTE` | `≥ 35%` |
| **Contextual Alert Dismissal Rate (5m)** | D3 | `5 minutes` from `alert_shown` | Distinct `alert_id` with `alert_dismissed` within 5 minutes of `alert_shown` | Distinct `alert_id` with `alert_shown` where `event_timestamp <= now() - INTERVAL 5 MINUTE` | `≤ 40%` |
| **D7 Active Install Retention** | D6 | `Days 7–13` (`168h` to `336h` post-install) | Distinct activated `install_id` firing at least one of (`app_launched`, `device_connected`, `widget_opened`, `alert_actioned`) during Days 7–13 after `app_installed` | Distinct activated `install_id` where `app_installed` occurred at least `14 days` ago (`<= now() - INTERVAL 14 DAY`) | `≥ 45%` |
| **D30 Active Install Retention** | D6 | `Days 28–34` (`672h` to `840h` post-install) | Distinct activated `install_id` firing at least one of (`app_launched`, `device_connected`, `widget_opened`, `alert_actioned`) during Days 28–34 after `app_installed` | Distinct activated `install_id` where `app_installed` occurred at least `35 days` ago (`<= now() - INTERVAL 35 DAY`) | `≥ 25%` |
| **Update Adoption Rate (14d)** | D6 | `14 days` from release publication timestamp | Distinct active `install_id` firing `app_updated` (or `app_launched` with `app_version >= target_version`) within 14 days of release | Distinct `install_id` active in the 14 days prior to release where `release_timestamp <= now() - INTERVAL 14 DAY` | `≥ 80%` |
| **80% Charge Limit Override Rate (7d)** | D7 | `7 days` rolling per active limit-enabled install | Count of `charge_limit_overridden` events over a 7-day window divided by count of `alert_shown` (`alert_type = charge_limit_80_reached`) in the same closed window | `alert_shown` (`charge_limit_80_reached`) where `event_timestamp <= now() - INTERVAL 7 DAY` | `≤ 20%` permanent disable; `< 35%` single-charge override |

## 7. Privacy, Consent & Data Governance

### 7.1 First-Run Opt-In Consent Architecture

1. **Zero Pre-Consent Collection or Buffering**: On initial startup, the analytics client is uninitialized (`disabled: true`) and **no `install_id` exists on disk**. Events occurring before the user clicks "Accept" on the first-run telemetry prompt are never queued in memory or written to disk.
2. **Event Ordering at Opt-In**: When the user clicks "Accept":
   - Step 1: Generate a fresh cryptographically random UUIDv4 `install_id` and save it to the local config store.
   - Step 2: Emit `telemetry_consent_granted`.
   - Step 3: Emit `app_installed` (if first run) and `onboarding_started`.
3. **Revocation ("Right to Erasure / Stop Collection")**: Turning off telemetry in Settings emits `telemetry_consent_revoked` (in v1.1+), immediately deletes the local `install_id` from disk, flushes/clears the local queue, and disables the SDK. If the user later opts back in, a brand-new `install_id` is generated so past and future histories cannot be linked.

### 7.2 Strictly Forbidden Data (Never Collect or Log)

| Forbidden Data Category | Examples Excluded | Technical Enforcement |
| :--- | :--- | :--- |
| **Hardware Identifiers & Names** | Raw USB/Bluetooth device strings (`Logitech G Pro X Superlight`), serial numbers, MAC addresses, Bluetooth BD_ADDR, USB `VID:PID`, motherboard UUID, `/etc/machine-id` | Hardware abstraction layer maps peripherals to generic `device_type` (`mouse`, `keyboard`, `headset`) and ephemeral `device_slot_id` (`slot_1`..`slot_8`). |
| **Foreground Window & Process Names** | Active game executables (`cs2.exe`, `dota2`), browser tab titles, Zoom/Teams meeting titles | Fullscreen detector returns only a boolean `fullscreen_app_active: true/false` via OS window-state flags (`SHQueryUserNotificationState` on Windows, compositor fullscreen hint on Linux). |
| **Network & Location Metadata** | Client IP address, Wi-Fi SSID, city/country GeoIP coordinates | Configure PostHog client with `disableGeoip: true` ([PostHog Node SDK](https://posthog.com/docs/libraries/node)) and enable "Discard client IP data" in PostHog EU project settings ([PostHog Privacy Controls](https://posthog.com/docs/product-analytics/privacy)). |
| **System Paths & Usernames** | OS username, `/home/<user>/...` or `C:\Users\<user>\...` paths | No file paths or stack traces are included in `error_occurred`; errors use a closed `error_code` enum. |
| **Behavioral Surveillance** | Keystrokes, mouse click coordinates, DPI values, microphone audio state, screenshots, session replay | PostHog Session Replay and Autocapture are strictly absent (`posthog-node` has no DOM autocapture). |
| **High-Frequency Battery Time Series** | Minute-by-minute battery percentage logs or voltage curves | `battery_state_changed` fires strictly on state transitions or threshold crossings (`20%`, `15%`, `10%`, `5%`, `80%`, `100%`). |

## 8. Implementation Guide (Electron & Native Desktop)

### 8.1 Electron Main-Process Implementation (`posthog-node`)

If the team selects Electron (or Tauri with a Node sidecar), run [`posthog-node`](https://posthog.com/docs/libraries/node) **exclusively in the Electron main process**—never in the renderer process (which would expose browser heuristics and complicate offline queueing).

```typescript
// src/main/analytics/telemetryClient.ts
import { PostHog } from 'posthog-node';
import { randomUUID } from 'node:crypto';

export class TelemetryService {
  private client: PostHog | null = null;
  private installId: string | null = null;
  private sessionId: string = randomUUID();

  public initIfConsented(consented: boolean, persistedInstallId?: string): void {
    if (!consented) {
      this.client = null;
      this.installId = null;
      return;
    }

    this.installId = persistedInstallId ?? randomUUID();
    this.client = new PostHog(process.env.POSTHOG_PROJECT_API_KEY!, {
      host: 'https://eu.i.posthog.com', // PostHog Cloud EU (Frankfurt)
      isServer: false,                  // Treat as client desktop app in PostHog
      disableGeoip: true,               // Never resolve or store IP geolocation
      flushAt: 20,                      // Batch up to 20 events before sending
      flushInterval: 10_000,            // Or flush every 10 seconds
      maxQueueSize: 5_000,              // Cap memory queue if offline
    });
  }

  public capture(eventName: string, properties: Record<string, unknown>): void {
    if (!this.client || !this.installId) return; // Strict no-op before consent

    this.client.capture({
      distinctId: this.installId,
      event: eventName,
      uuid: randomUUID(), // Maps to $insert_id for server-side deduplication
      properties: {
        ...this.getSuperProperties(),
        ...properties,
        $process_person_profile: false, // Anonymous event mode
        $geoip_disable: true,
      },
    });
  }

  public async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.shutdown(5_000); // 5s bounded flush on app quit
    }
  }

  private getSuperProperties(): Record<string, unknown> {
    return {
      install_id: this.installId,
      session_id: this.sessionId,
      app_version: '1.0.0',
      os_name: process.platform === 'win32' ? 'windows' : 'linux',
      display_server: this.detectDisplayServer(),
    };
  }

  private detectDisplayServer(): 'win32' | 'wayland' | 'x11' | 'unknown' {
    if (process.platform === 'win32') return 'win32';
    if (process.env.WAYLAND_DISPLAY) return 'wayland';
    if (process.env.DISPLAY) return 'x11';
    return 'unknown';
  }
}
```

### 8.2 Native Rust / C++ Implementation (Direct HTTP Batch API)

If the team builds a lightweight native utility (e.g., Rust + Tauri/iced/egui or C++/Qt):
- Send HTTPS `POST` requests directly to `https://eu.i.posthog.com/batch/` using an asynchronous background queue (`flushAt = 20`, `flushInterval = 10s`, max in-memory queue = `5,000` events).
- Include `"$insert_id": "<UUIDv4>"` inside each event's `properties` (or top-level `"uuid"`) so retries on flaky connections are automatically deduplicated by PostHog.
- Always pass `"$process_person_profile": false` and `"$geoip_disable": true` in `properties`.
- On `SIGTERM` / `WM_QUERYENDSESSION` / tray quit, flush remaining queued events with a strict `5,000 ms` timeout so shutdown never hangs the OS.

### 8.3 Desktop Attribution & UTM Handoff

Because desktop downloads break browser cookie sessions between the landing page and the installed binary:
1. **Package Manager Channels (`winget`, `aur`, `flatpak`, `appimage`, `deb_rpm`)**: Embed a build-time channel constant (`INSTALL_SOURCE=aur` or `INSTALL_SOURCE=winget`) in the package build spec so `app_installed` accurately reports organic package-manager adoption without needing web UTMs.
2. **Direct Website Downloads**: If the landing page offers a download button with campaign parameters (`?utm_source=reddit&utm_medium=community&utm_campaign=launch_v1`), encode sanitized enum tokens into the downloaded installer filename (e.g., `PeripheralBatterySetup-1.0.0-src_reddit-cmp_launch_v1.exe`) or an installer registry/config flag, read once at `app_installed`, and map only to allowlisted enum values (`reddit`, `github`, `discord`, `youtube`, `search`, `direct`). Never ingest raw arbitrary URL query strings into telemetry.

## 9. Event Volume Budget (Target: ≤10 Events / Active Install / Day)

A background system-tray utility must have near-zero network and CPU footprint. By emitting `battery_state_changed` only on discrete state transitions rather than periodic polling ticks, a typical daily active user generates **~7.4 events/day**, well inside the **≤10 events/install/day** ceiling:

| Event Category | Events Included | Expected Daily Frequency per Active Install | Rationale & Guardrails |
| :--- | :--- | :--- | :--- |
| **Lifecycle & Session** | `app_launched`, `app_updated` | `1.2 / day` | Most desktop users boot once per day or resume from sleep (`app_launched` fires only on process start, not OS wake). |
| **Device Connectivity** | `device_connected`, `device_disconnected` | `2.4 / day` | ~2 wireless peripherals (`mouse` + `headset`) connecting at boot and disconnecting on shutdown/idle sleep, with a 30-second debounce window. |
| **Battery State Transitions** | `battery_state_changed` | `1.5 / day` | Fires only on charging start/stop, 80% pause, full charge, or crossing `20%` / `15%` / `10%` / `5%` thresholds. |
| **Widget & Health Inspections** | `widget_opened`, `battery_health_viewed` | `1.0 / day` | Users glance at the tray icon passively and open the full widget popup ~1 time per day. |
| **Alerts & Power Suggestions** | `alert_shown`, `alert_actioned`, `alert_dismissed`, `alert_suppressed`, `power_saving_suggestion_*` | `1.0 / day` | Wireless mice/headsets need charging every 2–5 days; end-of-day prompts or low-battery alerts average ≤1 cycle/day. |
| **Settings, Overrides & Errors** | `setting_changed`, `charge_limit_overridden`, `error_occurred` | `0.3 / day` | Occasional setting adjustments; `error_occurred` is capped at 1 event per `error_code` per session. |
| **Total Daily Budget** | **All P0 Events** | **~7.4 events / day (Ceiling: ≤10 / day)** | **At 3,300 DAU ≈ 730k events/mo (Free tier). At 10,000 DAU ≈ 2.2M–3.0M events/mo.** |

## 10. Dashboards & Operational Decision Rules

### 10.1 Core Dashboards to Build in PostHog EU

1. **D1 & D6 Growth & Retention Overview `(Among Consenting Installs)`**:
   - Onboarding funnel: `telemetry_consent_granted` → `onboarding_started` → `device_connected` → `onboarding_completed` → `widget_opened` (7-day window).
   - D7 (Days 7–13) and D30 (Days 28–34) cohort retention curves split by `os_name` (`windows` vs `linux`) and `install_source` (`winget`, `aur`, `flatpak`, `direct_download`).
   - 14-day version adoption curve following each release.
2. **D2 & D4 Eco-Optimizer & Predictive Usage Scorecard `(Among Consenting Installs)`**:
   - `power_saving_suggestion_shown` → `power_saving_suggestion_applied` (24h acceptance rate) broken down by `suggestion_type` (`turn_off_rgb`, `enable_sleep_timer`) and `surface` (`tray_widget` vs `overlay_toast`).
   - 7-day revert rate (`power_saving_suggestion_reverted`) grouped by `time_since_applied_bucket`.
3. **D3 & D7 Alert Effectiveness & Battery Health Guard `(Among Consenting Installs)`**:
   - `alert_shown` → `alert_actioned` (10m) vs `alert_dismissed` (5m) vs `alert_suppressed` across `alert_type` (`low_battery_15pct`, `end_of_day_plug_in`, `charge_limit_80_reached`).
   - 80% charge limit adoption (`setting_changed` where `setting_key = charge_limit_80_enabled`) vs override rate (`charge_limit_overridden`).
4. **D5 Cross-Platform Hardware & Linux Display Server Reliability `(Among Consenting Installs)`**:
   - `error_occurred` breakdown by `error_code`, `os_name`, `linux_distro_family`, `display_server` (`wayland` vs `x11` vs `win32`), and `protocol_driver`.
   - `notification_permission_result` grant rate across desktop environments.

### 10.2 Concrete Product Decision Rules (If-This-Then-That)

| Decision ID | Observed Metric Signal (After ≥200 Closed Cohort Installs) | Action Taken by Product / Engineering |
| :--- | :--- | :--- |
| **D1** | `device_connected` occurs in `< 60%` of Linux installs while `error_code = udev_permission_denied` exceeds `15%` | Add a one-click udev rule installer / PolicyKit prompt inside the Linux onboarding wizard and update AUR/Flatpak package post-install instructions. |
| **D2** | `turn_off_rgb` has `< 15%` acceptance on `tray_widget` OR `> 25%` 7-day revert rate (`power_saving_suggestion_reverted`) | Replace permanent RGB-off with an automatic "Turn off RGB only below 30% battery or when idle >5 min" smart rule so users keep aesthetics when charged. |
| **D3** | `end_of_day_plug_in` alert has `> 50%` dismissal rate (`alert_dismissed`) and `< 15%` action rate (`alert_actioned`) | Raise default urgency filter so the end-of-day prompt only triggers when headset/mouse battery is `≤ 20%` (around `< 3h` gaming remaining) rather than on every PC lock. |
| **D3 / D5** | `in_game_focus_overlay` fails (`error_code = overlay_render_failed`) on `display_server = wayland` in `> 10%` of sessions | Automatically fall back to low-priority `os_native_toast` with `urgency = low` on Wayland compositors lacking layer-shell support. |
| **D7** | `charge_limit_overridden` (`override_scope = permanent_disable_at_pause`) exceeds `30%` within 7 days of enabling the 80% limit | Make "Charge to 100% Once (Top-Up for Today)" the primary button on the `charge_limit_80_reached` toast so users don't permanently disable battery health protection. |

## 11. Engineering QA Checklist & Example Payloads

### 11.1 Pre-Release Telemetry QA Checklist

- [ ] **Pre-Consent Silence Test**: Launch the app on a clean VM with Wireshark/mitmproxy open. Verify **zero** outbound packets to `eu.i.posthog.com` and **no** `install_id` written to disk when the consent modal is left open or declined.
- [ ] **Consent Ordering Test**: Click "Accept Telemetry" on first run. Verify the batch payload contains `telemetry_consent_granted` as the earliest timestamp, followed by `app_installed` and `onboarding_started`.
- [ ] **PII & Hardware Scrubber Audit**: Connect a Bluetooth headset and a 2.4GHz mouse. Inspect outgoing JSON payloads and confirm zero occurrences of device model names, MAC addresses, serials, OS usernames, window titles, or IP addresses (`$geoip_disable: true`).
- [ ] **Debounce & Polling Silence Test**: Let the app run for 2 hours while discharging from `78%` to `65%`. Confirm **zero** `battery_state_changed` events fire during normal non-threshold discharge ticks.
- [ ] **Join ID Integrity Test**: Trigger a `low_battery_15pct` overlay toast (`alert_shown`) and click `Mute RGB (+2hrs)` (`alert_actioned`). Confirm both events share the exact same `alert_id`. Apply `turn_off_rgb` (`power_saving_suggestion_applied`), restart the app 2 days later, turn RGB back on, and verify `power_saving_suggestion_reverted` carries the persisted `suggestion_id`.
- [ ] **Graceful Quit Flush**: Trigger an event and immediately quit the tray app. Confirm `client.shutdown(5000)` flushes the batch before the process exits.

### 11.2 Example JSON Payloads

#### Example 1: Contextual Low-Battery Overlay Toast Actioned (`alert_actioned`)

```json
{
  "event": "alert_actioned",
  "distinct_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-11-13T14:22:10.412Z",
  "properties": {
    "install_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "session_id": "1c9e6679-7425-40de-944b-e07fc1f90ae7",
    "app_version": "1.0.0",
    "os_name": "linux",
    "os_version_bucket": "linux_kernel_6_x",
    "linux_distro_family": "arch",
    "display_server": "wayland",
    "install_source": "aur",
    "ui_locale": "mn",
    "$process_person_profile": false,
    "$geoip_disable": true,
    "alert_id": "7f8c2b10-91a4-4e2b-8c3d-112233445566",
    "alert_type": "low_battery_15pct",
    "action_taken": "mute_rgb_clicked",
    "response_time_sec_bucket": "lt_10s",
    "device_type": "headset"
  }
}
```

#### Example 2: Power-Saving Suggestion Reverted After 2 Days (`power_saving_suggestion_reverted`)

```json
{
  "event": "power_saving_suggestion_reverted",
  "distinct_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "uuid": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "timestamp": "2026-11-15T19:05:44.108Z",
  "properties": {
    "install_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "session_id": "8f4b2c19-3310-49a1-b82c-9012fa83bc11",
    "app_version": "1.0.0",
    "os_name": "windows",
    "os_version_bucket": "win_11",
    "linux_distro_family": null,
    "display_server": "win32",
    "install_source": "winget",
    "ui_locale": "en",
    "$process_person_profile": false,
    "$geoip_disable": true,
    "suggestion_id": "3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
    "suggestion_type": "turn_off_rgb",
    "device_type": "mouse",
    "revert_surface": "tray_widget",
    "time_since_applied_bucket": "1d_to_7d",
    "battery_pct_bucket": "61_to_79"
  }
}
```

## 12. Open Questions for Engineering & Product Sign-Off

1. **Desktop Runtime Stack**: Will v1 be built in **Electron**, **Tauri (Rust + WebView)**, or a **native Rust/C++ GUI**? (Determines whether we use [`posthog-node`](https://posthog.com/docs/libraries/node) directly or a lightweight Rust HTTP batch client.)
2. **Cloud EU vs. Self-Hosted PostHog**: Is [PostHog Cloud EU (Frankfurt)](https://posthog.com/blog/posthog-cloud-eu) approved by legal/privacy review, or do we need a self-hosted PostHog Docker deployment?
3. **Legal Sign-Off on Pseudonymous `install_id`**: Does legal review approve storing a post-consent random UUIDv4 `install_id` for D7/D30 retention (D6), or must we fall back to [Aptabase](https://aptabase.com/legal/privacy) and drop multi-day cohort metrics?
4. **Linux Packaging & Hardware Permissions**: Which Linux distribution formats launch in v1 (`AUR`, `Flatpak`, `AppImage`, `.deb`), and how will `udev` rules for HID++/OpenRazer battery & RGB control be bundled?
5. **80% Charge Limit Hardware Support**: Since firmware-level 80% charge cutoffs are only supported on select peripherals, should `charge_limit_80_reached` default to a software unplug alert for devices without hardware cutoff registers?
6. **Crash Reporting Separation**: Will unhandled native/process crashes be tracked via a dedicated crash reporter (e.g., Sentry opt-in) rather than product analytics (`error_occurred` only tracks handled application/hardware errors)?
