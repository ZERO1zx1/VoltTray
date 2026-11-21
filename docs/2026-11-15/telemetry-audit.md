# VoltTray Telemetry Audit

**Date:** 2026-11-15
**Scope:** `src/features/telemetry/`, `src/server/persistence/localStore.ts`, telemetry routes in `src/server/main.ts`, event types in `src/shared/types.ts`, privacy copy in `src/shared/i18n.ts`, and the two tracking plans in `docs/product/tracking/`.
**Method:** static review of every call site and import, test run, and comparison against the merged tracking plan (`tracking-plan_3163b0eb.md`, draft v0.2). No packet capture was needed: there is no telemetry egress to capture.
**Out of scope:** hardware probes, Rust tray lifecycle, marketing-site analytics.

> **Товч дүгнэлт (Mongolian summary)**
> Telemetry engine нь сайн бүтэцтэй: consent guard, PII шалгалт, `alert_id`/`suggestion_id` join, 26 тест бүгд pass. Гэвч энэ нь бодит апп-д **холбогдоогүй** байна. Consent UI, frontend bridge, flush/transport, PostHog SDK, `app_launched` emitter аль нь ч байхгүй тул одоогоор **нэг ч эвент илгээгдэхгүй**. Мөн Linux дээр `os`/`display_server` нь Windows default болж харагдах, revoke хийхэд queue цэвэрлэгдэхгүй, `alert_suppressed` хязгааргүй олшрох эрсдэлтэй. Эхлээд canonical tracking plan-аа сонгож, persistence + consent UI + launch event + transport-ыг дараалуулан хийх шаардлагатай.

---

## 1. Executive summary

The repository contains a **library-grade analytics engine** with better privacy design than most shipping desktop apps:

- strict no-op before consent (`analyticsEngine.ts:196-198`);
- `$process_person_profile: false` and `$geoip_disable: true` on every event;
- forbidden-key, email, MAC, and path checks (`analyticsEngine.ts:48-96`);
- joined IDs for alerts and suggestions;
- debounce and per-session caps for noisy events;
- 7 telemetry unit tests, all passing in a 26/26 suite.

But it is **not connected to the product**:

| Layer | Exists | Reachable from the app |
|---|---|---|
| Event engine | Yes, 875 lines | No import outside its test and the local store validator |
| Consent modal | i18n strings only | No UI component references them |
| Settings/privacy panel | i18n strings only | No UI component references them |
| Frontend → server bridge | No telemetry methods in `desktopBridge.ts` | No |
| Flush / transport | No; only a local JSONL append endpoint | No client calls it |
| PostHog client | No dependency, no endpoint, no token | No |
| Audit-log read API | No GET route | No |
| Launch event | Only emitted inside the consent-grant function | No |
| State persistence / hydration | No | No |

**Net result: zero events are emitted by the shipping application.** The engine is effectively a tested specification, not a running pipeline. `docs/architecture.md:81` already admits this: "Telemetry engine ... local store validation болон тестэд ашиглагддаг; бүх analytics UI идэвхтэй гэж үзэхгүй."

The user-facing copy has not caught up. `src/shared/i18n.ts:257` (EN) and `:422` (MN) tell users analytics is "powered by PostHog EU rules", while `package.json` and `package-lock.json` contain no PostHog package and no code opens a connection to PostHog. Until egress exists, that copy is inaccurate.

**Scorecard**

| Area | Grade | Why |
|---|---|---|
| Privacy design | A− | Minimal, bucketed, anonymous, opt-in by design |
| Privacy implementation | C | Revoke keeps the queue and suggestion joins; no egress means no IP-discard verification |
| Event coverage | C | 15 of 23 P0 event names have emitters; 8 have none; 1 is mis-scoped |
| Wiring | F | 0 call sites in the app |
| Data quality | D+ | Hardcoded version/channel/source/arch; Linux environment misreported |
| Join integrity | B in memory / F across restarts | Suggestion records are not persisted |
| Tests | B− unit / F integration | 26 pass, but none exercise wiring, revoke, server validation, or transport |
| Documentation | C | Two tracking plans conflict; consent copy contradicts the binary |

---

## 2. Current data flow (as built)

```text
[ React widget ]
      │  no analytics calls
      ▼
[ analyticsEngine.ts ] ──► [ analyticsEngine.test.ts ]  (7 tests)
      │
      │  only import outside tests:
      ▼
[ localStore.ts ] ◄── POST /api/local/telemetry   (no client calls this)
      │                 POST /api/local/telemetry/reset
      ▼
[ .volttray/telemetry.jsonl ]  (local disk only, 1,000-event cap)

[ PostHog EU ]  ── no SDK, no token, no network code ──  ✗
```

Intended flow from the plan:

```text
consent UI → engine → bridge/queue → PostHog EU batch endpoint
                                  └→ local sanitized audit log
```

The first arrow does not exist, so nothing downstream can run.

---

## 3. Evidence of non-wiring

| Evidence | Location |
|---|---|
| The only non-test imports of the engine are `validatePayloadSafety` in the local store | `src/server/persistence/localStore.ts:3` |
| No `analyticsEngine` import in `App.tsx`, `desktopBridge.ts`, or the server entry | `grep -rn "analyticsEngine" src` returns only the engine and its test |
| `App.tsx` never references `consentModal`, `settingsView`, `analytics`, or `telemetry` | `src/app/App.tsx` (847 lines) |
| Consent and privacy strings are defined but unused | `src/shared/i18n.ts:284-299`, `:449-464` |
| The bridge exposes hardware/state/autostart only | `src/platform/desktopBridge.ts` |
| The server exposes POST append and POST reset, but no GET for the audit log | `src/server/main.ts:164-180` |
| The Rust bootstrap returns no telemetry state | `src-tauri/src/main.rs:90-129` |
| No PostHog dependency | `package.json`, `package-lock.json` (`grep -ci posthog` = 0) |
| The architecture doc states analytics UI is not active | `docs/architecture.md:81` |

---

## 4. Event coverage against the merged plan

The event union declares 23 P0 events (`src/shared/types.ts:205-228`). 15 have an emitter function; 8 do not. None are wired to a UI or lifecycle call site.

| # | Event | Emitter | Wired | Notes |
|---|---|---|---|---|
| 1 | `telemetry_consent_granted` | Yes | No | Generated in `grantAnalyticsConsent` |
| 2 | `app_installed` | Yes | No | Emitted at consent time, not at first launch |
| 3 | `app_launched` | Partial | No | Only inside consent grant; not on real launches |
| 4 | `onboarding_started` | **No** | No | Declared only |
| 5 | `onboarding_step_completed` | Yes | No | Function exists; no onboarding UI |
| 6 | `onboarding_completed` | **No** | No | Declared only |
| 7 | `device_connected` | Yes | No | 30s debounce implemented |
| 8 | `device_disconnected` | **No** | No | Declared only |
| 9 | `widget_opened` | **No** | No | Declared only |
| 10 | `battery_state_changed` | Yes | No | Threshold/charging-transition only; tested |
| 11 | `battery_health_viewed` | **No** | No | Declared only |
| 12 | `power_saving_suggestion_shown` | Yes | No | 7-day dedupe by slot/type |
| 13 | `power_saving_suggestion_applied` | Yes | No | Joins on `suggestion_id` |
| 14 | `power_saving_suggestion_reverted` | Yes | No | In-memory join only |
| 15 | `alert_shown` | Yes | No | 60s cooldown |
| 16 | `alert_actioned` | Yes | No | No 10-minute window enforcement |
| 17 | `alert_dismissed` | Yes | No | Timeout bucket hardcoded |
| 18 | `alert_suppressed` | Yes | No | **No suppression dedupe** |
| 19 | `permission_result` | Yes | No | Once per type/status per session |
| 20 | `setting_changed` | **No** | No | Declared only |
| 21 | `charge_limit_overridden` | **No** | No | Declared only |
| 22 | `error_occurred` | Yes | No | Once per code per session |
| 23 | `app_updated` | **No** | No | Declared only |

Missing emitters block these decisions directly:

- D1 onboarding/activation: `onboarding_started`, `onboarding_completed`
- D4 engagement: `widget_opened`, `device_disconnected`
- D6 retention/update: a real `app_launched`, `app_updated`
- D7 health/charge limit: `battery_health_viewed`, `setting_changed`, `charge_limit_overridden`

---

## 5. Findings

### A. Blockers

#### A1. The engine is unreachable in the running app
**Severity:** Blocker
**Evidence:** Section 3.
**Impact:** All dashboards are empty. Consent copy promises collection that cannot start. Any "analytics" claim in release notes is false.
**Fix:** Wire the engine at the process that owns the tray lifecycle (Node server for browser fallback, Rust side or a trusted Node sidecar for Tauri). Expose a narrow, typed bridge. Add a single flush path. Do not initialize a second client in the renderer.

#### A2. No consent UI exists
**Severity:** Blocker
**Evidence:** `consentModal` and `settingsView` dictionaries exist (`i18n.ts:284-299`, `:449-464`) but no component references them. `App.tsx` renders only the widget.
**Impact:** A user cannot opt in or out, so the engine's `consented` flag can never become true through the product. There is also no way to exercise the "Reset analytics ID" copy.
**Fix:** Build the first-run consent modal and the Settings → Privacy section (toggle, current install ID, reset, audit log). Or remove the copy until the UI ships.

#### A3. No analytics state persistence or hydration
**Severity:** Blocker
**Evidence:**
- `AnalyticsState` is in-memory (`analyticsEngine.ts:110-138`).
- `createInitialAnalyticsState` resets `installId`, `firstSeenTimestampMs`, `hasEmittedAppInstalled`, `hasEverConsentedBefore`, and `suggestionsById` (`:140-161`).
- `grantAnalyticsConsent` always mints a new UUID (`:236`) and emits `app_installed` whenever the in-memory flag is false (`:258`).
- The disk store persists only `consented`, `consentDecided`, and `installId` (`localStore.ts:11-17`); there is no restore function.

**Impact:** If wired naively, every app launch would look like a new install: a fresh install ID, a duplicate `app_installed`, `is_reopt_in=false`, `install_age_days_bucket=0`, and no 7-day suggestion reverts. D7/D30 retention and every funnel would be wrong.
**Fix:** Persist the full analytics state atomically (install ID, first-seen timestamp, consent version, install flags, suggestion records, cooldown maps). Add `restoreAnalyticsState` and hydrate before the first emit. Mint an ID only on the consent transition. Add a restart test.

#### A4. No transport, despite the PostHog claim
**Severity:** Blocker for measurement; High for trust
**Evidence:** No `posthog` dependency, no endpoint constant, no `fetch` to `eu.i.posthog.com`, no flush function. The only sink is local JSONL (`main.ts:164-170`, `localStore.ts:99-123`). The copy at `i18n.ts:257` and `:422` says PostHog EU.
**Impact:** No remote analytics. The consent text misdescribes the product's behavior.
**Fix:** Choose one of two paths now:
1. **Implement PostHog EU** with consent gating, EU host, `$process_person_profile: false`, `disableGeoip`, IP-discard configured in the project, and a verified test event; or
2. **Stay local-only** and rewrite the copy to say data is stored on the device and not transmitted, until a transport ships.

Do not ship the current copy with the current binary.

#### A5. `alert_suppressed` has no dedupe and can flood
**Severity:** High
**Evidence:** The cooldown key is written only on the shown path (`analyticsEngine.ts:710-717`). The suppressed branch emits unconditionally whenever `evaluateAlertDecision` is called (`:663-679`).
**Impact:** If the function is called from the snapshot loop (the natural wiring), a user in DND or fullscreen generates one event per device per poll. With the 30s default poll that is 2,880 events/device/day; with the 5s browser fallback, 17,280. The plan budgets ≤10 events/install/day. One suppressed user could exceed the monthly free tier.
**Fix:** Key suppression by `device_slot_id:alert_type` and emit once per episode, or once per 10 minutes until the condition clears. Persist the key across launches. Add a test that calls the decision function repeatedly under DND and asserts one event.

### B. Privacy and consent

#### B1. Revocation does not clear the queue or joins
**Severity:** High (privacy)
**Evidence:** `revokeAnalyticsConsent` returns `{ ...state, consented: false, installId: null, lastDeviceConnectMs: {}, lastAlertByKeyMs: {} }` (`analyticsEngine.ts:291-299`). It leaves `events`, `suggestionsById`, `emittedPermissionsSession`, `emittedErrorCodesSession`, and `hasEmittedAppInstalled` untouched. `grantAnalyticsConsent` does not clear them either; new events are prepended to the old buffer (`:217-220`).
**Impact:** Events captured before revocation remain in memory. On re-opt-in they can be flushed under a new install ID, linking the two consent periods. That violates the plan's "clear the local queue" requirement and the "no linkage after reset" promise.
**Fix:** On revoke, clear `events`, `suggestionsById`, session dedupe sets, and cooldown maps; call the local store's `wipeTelemetry()`; persist the revoked state. Add a regression test that asserts `events.length === 0` after revoke and after re-opt-in.

#### B2. PII validation is a good first gate, not a schema
**Severity:** Medium
**Evidence:** `validatePayloadSafety` checks required PostHog flags, forbidden keys, and email/MAC/path regexes on string values (`analyticsEngine.ts:72-96`). It does not validate event names, enums, property types, `device_slot_id` format, string length, or nested objects.
**Impact:** Today all properties are flat and slot IDs are generated as `slot_1..slot_8` (`deviceGroups.ts:21`, `linuxProbe.ts:245-281`), so risk is low. A future free-text property, provider-derived slot, or error message could pass the regex gate. The gate also does not prove the absence of IP addresses; it only forbids the `ip`/`$ip` keys.
**Fix:** Define a typed event catalog and validate against it before append. Allowlist every string enum and bucket; reject unknown properties; enforce `device_slot_id = /^slot_[1-8]$/`; cap string length; add adversarial fixtures (email, MAC, `/home/user`, `C:\Users`, IPv4, IPv6, long text).

#### B3. Reset semantics are inconsistent
**Severity:** Medium
**Evidence:** `POST /api/local/telemetry/reset` wipes the file and sets `installId: null` but leaves `consented: true` (`main.ts:172-180`). `resetAnalyticsId` mints a new ID but keeps cooldown/dedupe maps and `hasEmittedAppInstalled` (`analyticsEngine.ts:301-312`). `appendTelemetry` silently returns 0 when the stored install ID is null (`localStore.ts:100-103`).
**Impact:** After a server-side reset, events are silently dropped until a client re-registers an ID. After an engine-side reset, stale cooldowns can suppress the first events and `app_installed` may not re-fire.
**Fix:** One reset path: clear queue, ID, cooldowns, suggestions, and flags; if consent remains, mint a new ID immediately and persist it; return the new ID to the client. Test both reset entry points.

#### B4. Consent copy and governance are incomplete
**Severity:** Medium
**Evidence:** The modal lists what is collected and never collected, but has no privacy-policy link, retention period, processor identity, or contact. `telemetry_consent_revoked` is not implemented (it is P1/optional in the plan). `$geoip_disable` is necessary but not sufficient to discard IP at ingestion.
**Impact:** GDPR/UK GDPR and Mongolia's personal-information law review cannot be completed from this copy. The "Zero PII" claim is strong language that depends on the validator and on IP discard.
**Fix:** Add the policy link, retention, processor/DPA status, and a plain-language revocation description. Before any egress, enable "Discard client IP data" and verify `$ip` is absent in stored events. Have counsel review the final text.

### C. Data quality and correctness

#### C1. Environment super properties are not host-detected
**Severity:** High
**Evidence:** `detectHostEnvironment()` correctly computes `os`, `osVersionBucket`, `displayServer`, and `distro` (`linuxProbe.ts:1049-1101`). The HTTP bootstrap returns it as a top-level `host` object (`main.ts:46-65`), but `App.tsx` ignores `host` and never reads `data.os` (`:117-131`). The bridge type does not include `host` (`desktopBridge.ts:11-18`). `buildSuperProperties` reads `settings.os`, `settings.displayServer`, `settings.distro` (`analyticsEngine.ts:163-186`), and those settings come from `INITIAL_SETTINGS`, which defaults to Windows 11 / win32 / Arch (`defaults.ts:3-18`).
**Impact:** On Linux, analytics would report `os=windows`, `os_version_bucket=win_11`, `display_server=win32`, and omit `distro` because the `if (settings.os === "linux")` branch never runs. D5 (Windows/Linux parity), Wayland error segmentation, and Linux activation become unmeasurable. A user who edits the settings could also spoof the environment.
**Fix:** Pass detected host data into analytics as an immutable super-property source. Do not derive OS/display server from mutable UI settings. Add Windows, Linux/X11, and Linux/Wayland fixture tests.

#### C2. Install and build metadata is hardcoded
**Severity:** High
**Evidence:** `createInitialAnalyticsState` sets `appVersion: "1.0.0"`, `buildChannel: "release"`, `installSource: "website"` (`analyticsEngine.ts:150-152`). Super properties set `arch: "x64"` and `first_app_version: state.appVersion` (`:176-180`). `app_installed` hardcodes `utm_source: "direct"`, `utm_medium: "other"`, `utm_campaign: "other"` (`:266-268`).
**Impact:**
- Every install is attributed to the website, so winget/AUR/Flatpak/GitHub adoption cannot be measured.
- Every version is 1.0.0, so update adoption and version segmentation are wrong.
- ARM64 installs are labeled x64.
- Dev builds are labeled release and would mix with production if ever sent.
- `first_app_version` is not the first version; it is the current one at state creation.
**Fix:** Inject version, channel, arch, and install source at build time from one source of truth (package metadata, Tauri config, CI channel constant). Store `first_app_version` on the first-ever launch and persist it. Remove the fabricated UTM properties until an installer handoff exists; if kept, map only allowlisted values.

#### C3. `app_launched` is not a launch event
**Severity:** High
**Evidence:** The only call is inside `grantAnalyticsConsent` (`analyticsEngine.ts:275-286`). There is no exported launch function and no session rotation outside `createInitialAnalyticsState`/`resetAnalyticsId`.
**Impact:** Active installs, DAU/WAU/MAU, D7/D30 retention, and session metrics are impossible. `app_launched` count would equal the number of consents, not launches.
**Fix:** Add `emitAppLaunched(state, settings, trigger, deviceCount, startMinimized)` and call it once per process start after hydration. Rotate `sessionId` per process. Use the real trigger (`user_manual`, `os_autostart`, `post_update_restart`, `tray`, `installer`).

#### C4. Suggestion lifecycle is not durable
**Severity:** High for D2
**Evidence:** `suggestionsById` is in-memory only (`analyticsEngine.ts:137`, `:420-429`). No persistence or hydration exists. `revertSuggestionIfActive` looks up the active record in memory (`:544-551`).
**Impact:** The plan's 7-day revert rate requires a join across restarts. After a restart, a revert is emitted with `source=manual` and no `suggestion_id`, so the revert rate is undercounted and manual/auto adoption is misclassified.
**Fix:** Persist suggestion records with `shownAtMs`, `appliedAtMs`, `revertedAtMs`, slot, type, and surface. Prune after 7 days. Add a restart test that applies, restarts, reverts, and asserts the same `suggestion_id`.

#### C5. `alert_shown` lacks episode dedupe
**Severity:** Medium
**Evidence:** The only guard is a 60-second cooldown (`analyticsEngine.ts:622-624`, `:710-717`). Nothing ties an alert to a threshold episode.
**Impact:** A low battery alert can re-fire every 61 seconds for as long as the device stays low, inflating alert counts and annoying users. The plan's alert decision model assumes threshold-triggered alerts.
**Fix:** Emit once per `(device_slot_id, alert_type, threshold episode)` until the battery recovers or charging state changes. Keep the 60s cooldown as a secondary guard. Test repeated calls at 61s.

#### C6. Action/dismissal windows are not enforced
**Severity:** Medium
**Evidence:** `resolveAlertActioned` buckets any response time, including `gt_10m` (`:723-744`). `resolveAlertDismissed` hardcodes `5m_to_10m` for every timeout (`:762-765`).
**Impact:** Actions taken hours later enter the action-rate numerator, inflating alert usefulness. A timeout that fires early or late is recorded with the wrong bucket.
**Fix:** Reject or separately flag actions after 10 minutes. Compute the timeout bucket from `responseSec`, or pass the actual timeout duration. Add boundary tests at 10s, 60s, 5m, 10m.

#### C7. Repeated apply can reuse one `suggestion_id`
**Severity:** Low
**Evidence:** `applySuggestion` finds an existing record by slot and type even if `appliedAtMs` is already set, then sets it again (`:474-504`).
**Impact:** Double-clicking or re-applying emits duplicate `power_saving_suggestion_applied` events with the same ID, inflating event volume. Distinct-ID counting hides it in PostHog but not in the local log.
**Fix:** Skip the emit if the record is already applied, or generate a new action ID per application if repeated actions are meaningful.

#### C8. Duplicate and inconsistent envelope properties
**Severity:** Low
**Evidence:** `install_source` appears in super properties and again in `app_installed` (`analyticsEngine.ts:179`, `:264`). `consent_version` in super properties vs `consent_schema_version` on the event (`:181`, `:251`). `permission_result` repeats `os` and `display_server` already present as super properties (`:789-790`). `uuid` is the dedupe key but the plan calls it `event_id` (`types.ts:233`).
**Impact:** Noise, ambiguous field ownership, and a mismatch with the plan and future dashboards.
**Fix:** Pick one owner per property, document the `uuid` ↔ `event_id` ↔ PostHog `$insert_id` mapping, and validate against the catalog.

### D. Server, storage, and reliability

#### D1. The server accepts arbitrary telemetry
**Severity:** Medium–High (integrity)
**Evidence:** `POST /api/local/telemetry` casts `req.body.events` to `TelemetryEnvelopeEvent[]` (`main.ts:164-167`). `appendTelemetry` checks consent and install ID, then applies only `validatePayloadSafety` (`localStore.ts:99-123`). There is no event-name allowlist, enum validation, `distinct_id === stored installId` check, timestamp validation, UUID dedupe, or rate limit.
**Impact:** A malformed or injected event can enter the local log. After a reset or re-consent, events carrying an old `distinct_id` can be appended. Retries duplicate lines. The PII gate is the only content check.
**Fix:** Validate with the typed catalog. Require `distinct_id === state.installId`, a valid UUID, and an ISO timestamp. Dedupe by `uuid`. Add a body size limit and a simple per-process rate limit. Return a per-event rejection reason instead of a single count.

#### D2. The local log is a lossy sink, not a queue
**Severity:** Medium
**Evidence:** The file is capped at 1,000 events and rewritten in full on every append (`localStore.ts:109-123`). There is no acknowledgement, retry, or forwarding.
**Impact:** The oldest events are silently dropped. If a transport is added later, this file cannot provide delivery guarantees. The full-file rewrite grows O(n) and blocks the event loop.
**Fix:** Define the file as either (a) a local audit log with documented retention, or (b) a durable queue with ack/retry/backoff. For (b), append-only writes plus a separate cursor/ack file, capped by bytes. Document the loss window on quit.

#### D3. No read API for the promised audit log
**Severity:** Medium
**Evidence:** `loadRecentTelemetry` exists (`localStore.ts:83-97`) but no route calls it. The Settings copy promises a "Live Sanitized Telemetry Audit Log" (`i18n.ts:279`).
**Impact:** The promised user-facing transparency feature cannot be built against the current server.
**Fix:** Add `GET /api/local/telemetry?limit=100` returning sanitized events, and wire the settings panel. Keep the response local-only.

#### D4. `emitEvent` drops unsafe events silently
**Severity:** Low
**Evidence:** When `validatePayloadSafety` fails, the function returns `{ nextState: state, emitted: null }` (`analyticsEngine.ts:211-214`).
**Impact:** A schema or PII bug becomes invisible data loss. There is no counter, log, or `error_occurred`.
**Fix:** In debug builds, throw or log the rejected payload locally. In release, increment a local rejection counter and emit `error_occurred` with `error_code=analytics_flush_failed` (without the payload) once per session. Never log the offending value itself.

### E. Documentation and naming

#### E1. Two tracking plans conflict
**Severity:** Medium
**Evidence:** `tracking-plan_3163b0eb.md` (draft v0.2, merged, 23 events) and `tracking_plan_c0f195eb.md` (v1.0, 22 events) disagree on:
- event name: `permission_result` vs `notification_permission_result`;
- super properties: `os` vs `os_name`, `locale` vs `ui_locale`, `distro` vs `linux_distro_family`;
- device-count buckets: `2_3`/`4_plus` vs `3_plus`;
- install-source values: `website`/`apt` vs `direct_download`/`deb_rpm`;
- the 80% override KPI denominator: installs with a `paused_limit` transition (v0.2) vs `alert_shown` event count (v1.0).

The code follows v0.2 names in most places. The v1.0 plan's override KPI divides event counts by alert counts, which is a units mismatch the analytics skill explicitly warns against.
**Impact:** Implementers and dashboard authors cannot tell which catalog is authoritative. The code already reflects v0.2, so the v1.0 doc is a trap.
**Fix:** Mark v0.2 as canonical, fold any unique v1.0 content into it, and move the other to `archive/`. Generate the TypeScript event catalog from the canonical doc (or validate one against the other in CI). Keep one list.

#### E2. Consent copy contradicts the binary
**Severity:** High (trust/legal)
**Evidence:** `i18n.ts:257` and `:422` claim PostHog EU processing; no transport exists.
**Impact:** Users consent to a data flow that does not happen, and the product makes a processor claim it cannot substantiate. If a transport is added later without updating the copy, the reverse problem appears.
**Fix:** Make the copy describe the current behavior. If local-only: "Stored on this device; not transmitted." If PostHog ships: name the processor, region, retention, and link the policy. Review with counsel.

### F. Testing

#### F1. The green suite does not test the product path
**Severity:** Medium
**Evidence:** 7 telemetry tests cover pre-consent silence, consent ordering, re-opt-in, threshold transitions, suggestion joins, alert exclusivity, and debounce/caps (`analyticsEngine.test.ts:1-308`). They do not cover:
- revoke clearing the queue;
- server schema/`distinct_id` rejection;
- host environment properties;
- missing emitters or launch wiring;
- suppression dedupe;
- persistence/hydration across restart;
- PII negative fixtures;
- any transport.

**Impact:** `npm test` reports 26/26 passing while the shipping app emits nothing. The suite validates the specification, not the integration.
**Fix:** Add a small integration harness with a fake transport and a temp directory. Cover restart, revoke/re-opt-in, reset, suppressed-alert repetition, host fixtures, and a fixture scanner for emails/IPs/paths. Add a CI check that the event catalog and the union stay in sync.

---

## 6. What is already good (keep it)

- **Consent guard is centralized.** Every emitter goes through `emitEvent`, so there is one place to enforce the no-op (`analyticsEngine.ts:189-223`).
- **Anonymous mode is explicit.** `$process_person_profile: false` and `$geoip_disable: true` are required by the validator, not optional.
- **Bucketing is centralized.** `batteryMath.ts` owns percentage, hours, duration, response-time, device-count, and gain buckets, so events do not invent local formats.
- **Join IDs are designed.** `alert_id` joins shown → actioned/dismissed; `suggestion_id` joins shown → applied → reverted. The tests prove the in-memory joins.
- **Noise controls exist.** Device connect debounce, error once per code per session, permission once per status, battery transitions only on threshold/charging changes.
- **The alert decision function emits exactly one of shown/suppressed.** That is the right shape for a trustworthy suppression rate.
- **The merged plan is unusually rigorous.** Closed observation windows, pending cohorts, denominator definitions, volume budget, and a QA checklist are all present.

The problem is not the design. It is the last mile.

---

## 7. Recommended fix sequence

### Phase 0 — Decide and tell the truth (before code)
1. Pick the canonical plan: **v0.2 merged**. Archive the other.
2. Decide transport: **PostHog EU** or **local-only**. Do not claim one while shipping the other.
3. Fix the two consent strings immediately to match the current binary.
4. Write down the retention period, processor, and policy link the consent modal will show.

**Exit criteria:** one plan, one transport decision, copy that a lawyer and a user can both read without being misled.

### Phase 1 — Make the pipeline real
1. Persist and hydrate analytics state: install ID, first-seen timestamp, consent version, flags, suggestions, cooldowns.
2. Add `emitAppLaunched` and call it once per process start; rotate `sessionId`.
3. Build the consent modal and Settings → Privacy panel (toggle, install ID, reset, audit log).
4. Add bridge methods for consent, state, append, reset, and read.
5. Feed host detection (`os`, `osVersionBucket`, `displayServer`, `distro`) into super properties, not mutable settings.
6. Inject version, channel, arch, and install source at build time.
7. Add the transport with a strict consent gate and a local queue.

**Exit criteria:** a consenting install produces `telemetry_consent_granted → app_installed → app_launched`; a restart produces only `app_launched` with the same install ID; a declining install produces zero events and zero requests.

### Phase 2 — Close the P0 coverage
1. Add emitters and call sites for the 8 missing events.
2. Add suppression episode dedupe.
3. Persist suggestion records for the 7-day join.
4. Fix revoke/reset to clear the queue and joins.
5. Enforce the 10-minute action window and compute the timeout bucket.

**Exit criteria:** every P0 event in the catalog has an emitter and a call site; the restart revert test passes; repeated DND polls produce one suppressed event per episode.

### Phase 3 — Harden
1. Build the typed event catalog and server-side schema validation.
2. Require `distinct_id === stored installId`, valid UUID/timestamp, and UUID dedupe.
3. Add PII negative fixtures and a CI catalog-conformance check.
4. Verify IP discard in PostHog (`$ip` absent), not just `$geoip_disable`.
5. Load-test the volume budget: ≤10 events/install/day for a normal user, bounded for DND/fullscreen.
6. Document the quit/offline loss window.

**Exit criteria:** malformed events are rejected with reasons; PII fixtures fail closed; a 24-hour offline test flushes once without duplicates; a normal user stays under budget.

### Phase 4 — Measure
1. Build the five dashboards from the plan: activation, engagement/retention, power features, alerts, health/reliability.
2. Use closed windows and label pending cohorts.
3. Label every readout "(Among Consenting Installs)".
4. Run the first weekly review only after 200 closed-cohort installs; write hypotheses and decisions, not just charts.

**Exit criteria:** D1/D2/D3/D6/D7 each have a trustworthy numerator and denominator over the same closed window.

---

## 8. Immediate shortlist (this week)

If only five things get done:

1. **Correct the consent copy** so it does not claim PostHog while the binary has no transport.
2. **Add `restoreAnalyticsState` + persistence** so a restart does not mint a new install ID.
3. **Add and call `emitAppLaunched`** so retention is measurable at all.
4. **Clear `events` and `suggestionsById` on revoke** so re-opt-in cannot link old behavior.
5. **Add suppression dedupe** before any call site can emit on every poll.

Then wire the consent modal and one transport, and the rest of the plan becomes executable.

---

## 9. Open questions

1. **Transport:** Is PostHog EU approved, or is local-only the shipping stance for v1?
2. **Tauri process ownership:** Should analytics live in Rust, the Node fallback server, or a sidecar? The plan recommends one client in the main process; the current repo has two runtimes.
3. **Consent UX:** First-run modal, Settings-only, or both? The plan says first-run opt-in with a later Settings path.
4. **Install source:** How will winget/AUR/Flatpak/GitHub builds inject their channel? Build-time constant per package is the plan's recommendation.
5. **Retention and legal:** 12 months? DPA signed? Mongolia counsel review?
6. **Canonical plan:** Confirm v0.2 and archive v1.0, or merge them first.
7. **Local audit log:** Is it a user-facing transparency feature, a pre-send queue, or both? The answer changes the storage design.

---

## Appendix A — Audit commands used

```bash
grep -rn "analyticsEngine" src
grep -rn "consentModal\|settingsView" src --include="*.tsx" --include="*.ts"
grep -rn "telemetry" src/platform src/app src/server/main.ts
grep -ci "posthog" package.json package-lock.json
npm test
```

## Appendix B — File reference

| Concern | File |
|---|---|
| Event engine | `src/features/telemetry/analyticsEngine.ts` |
| Engine tests | `src/features/telemetry/analyticsEngine.test.ts` |
| Event union | `src/shared/types.ts:205-228` |
| Buckets | `src/features/battery/batteryMath.ts` |
| Local store | `src/server/persistence/localStore.ts` |
| Telemetry routes | `src/server/main.ts:164-180` |
| Host detection | `src/server/hardware/linuxProbe.ts:1049-1101` |
| Widget UI | `src/app/App.tsx` |
| Runtime bridge | `src/platform/desktopBridge.ts` |
| Consent copy | `src/shared/i18n.ts:257`, `:284-299`, `:422`, `:449-464` |
| Tracked plan (canonical) | `docs/product/tracking/tracking-plan_3163b0eb.md` |
| Conflicting plan | `docs/product/tracking/tracking_plan_c0f195eb.md` |
| Architecture admission | `docs/architecture.md:81` |
