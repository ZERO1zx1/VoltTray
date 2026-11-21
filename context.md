# VoltTray — Project Context

> Generated: 2026-11-21 (workspace scan).  
> Scope: static, evidence-based scan of `/home/light/Projects/battery`.  
> Validation: no build/tests executed in this scan; runtime behavior marked **unverified** where not confirmed by code/docs.

## 1. Snapshot

| Field | Value | Evidence |
|---|---|---|
| Product | VoltTray — local desktop battery/peripheral tray monitor | `README.md`, `package.json` |
| Platforms | Windows, Linux (Tauri desktop); local browser/dev fallback | `README.md`, `src-tauri/tauri.conf.json`, `src/server/main.ts` |
| Version | `1.0.0` | `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` |
| Git | `main...origin/main`, last commit `e103c12 Initial commit: VoltTray battery tray app for Windows and Linux` | `git status`, `git log` |
| Working tree | Untracked: `docs/2026-11-15/telemetry-audit.md`, `landing/` | `git status --short` |
| License | **No LICENSE/COPYING file found** | repo root listing |
| CI | **No `.github/` workflows found** | repo root listing |

## 2. What VoltTray Does

VoltTray shows computer/peripheral battery level and charging state in a tray/widget experience. It targets local-first operation: hardware readings, settings, and consented telemetry validation/storage are local. README states no Gemini API key required.

Key capabilities represented in code/docs:
- Tray/widget battery monitor for connected devices.
- Predictive gaming/office usage estimates and power-saving suggestions (battery math).
- Low-battery/alert flows and overlay toast component.
- Linux hardware probing/providers: UPower/sysfs/OpenRazer/headsetcontrol patterns, kAirPods D-Bus provider, USB identity/M220 support.
- Optional Linux autostart integration (desktop/server paths).
- Local telemetry engine with payload-safety validation; end-to-end emission path is **unverified/incomplete**.

## 3. Tech Stack

### Frontend / app
- React `^19.0.1`, React DOM `^19.0.1`
- Vite `^8.3.0`, `@vitejs/plugin-react`, `@tailwindcss/vite`, Tailwind `^4.3.3`
- `lucide-react`, `motion`
- TypeScript `^7.0.2`

### Local server / tooling
- Express `^4.21.2`, TSX `^4.21.0`
- Node scripts: `scripts/test.mjs` (auto-discovers `src/**/*.test.ts`), `scripts/clean.mjs` (removes `dist/` only)

### Desktop / native
- Tauri 2, `tauri-build` 2, tray-icon feature
- Rust 2021 edition, serde/serde_json
- Release profile: `panic=abort`, `lto=true`, `opt-level="s"`, `strip=true`, `codegen-units=1`

## 4. Commands

```bash
npm ci
npm run dev          # tsx src/server/main.ts (local 127.0.0.1:3000)
npm run start        # same as dev
npm run tauri:dev
npm run tauri:build
npm run build        # vite build
npm run lint         # tsc --noEmit
npm test             # node scripts/test.mjs
npm run clean        # removes dist/
cargo test --manifest-path src-tauri/Cargo.toml --locked --offline
```

## 5. Repository Map

```text
.
├── README.md
├── package.json
├── index.html                  # Vite HTML entry
├── vite.config.ts
├── tsconfig.json
├── docs/                       # architecture, build, airpods, m220, reports, audits
├── landing/                    # UNTRACKED: Mongolian marketing landing page
├── scripts/                    # test discovery, clean, install helpers
├── src/
│   ├── main.tsx
│   ├── app/                    # App.tsx, styles.css
│   ├── features/
│   │   ├── battery/            # batteryMath, deviceStatus, DeviceIcon, tests
│   │   ├── notifications/      # OverlayToast.tsx
│   │   └── telemetry/          # analyticsEngine.ts + test
│   ├── platform/               # desktopBridge.ts
│   ├── shared/                 # types.ts, defaults.ts, i18n.ts
│   └── server/
│       ├── main.ts             # Express/Vite local API
│       ├── hardware/           # linuxProbe, linuxControls, deviceGroups, providers
│       ├── http/               # listen.ts
│       └── persistence/        # localStore.ts
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # tray, commands, bootstrap/cache
│   │   ├── autostart.rs
│   │   ├── linux_controls.rs
│   │   └── hardware/           # mod.rs, kairpods.rs, usb_identity.rs, m220.rs, device_groups.rs
│   ├── capabilities/
│   ├── icons/
│   ├── linux/                  # udev rules
│   └── tauri.conf.json
└── .volttray/                  # local runtime state (not source)
```

## 6. Runtime Architecture

### Dual-runtime model
- **Tauri desktop:** React UI calls `window.__TAURI_INTERNALS__.invoke(...)` through `src/platform/desktopBridge.ts`.
- **Browser/local fallback:** same UI uses local HTTP/SSE endpoints from `src/server/main.ts`.

### Tauri commands (`src-tauri/src/main.rs`)
- `get_local_bootstrap` — returns bootstrap snapshot; uses cache/force behavior.
- `save_local_state` — persists local state payload.
- `set_autostart` — OS login autostart toggle.
- `set_widget_pinned` — always-on-top toggle.
- `hide_widget` — hides main window.
- `run_linux_hardware_action` — executes Linux hardware action request.

### Local server endpoints (`src/server/main.ts`)
- `GET /api/health` — mode/host/capabilities.
- `GET /api/local/bootstrap` — settings/devices/charger/autostart snapshot.
- `GET /api/local/stream` — SSE device snapshot (1.5s interval, deduped payload).
- `POST /api/local/state` — merge/persist state; wipes telemetry when not consented.
- `POST /api/local/autostart` — persist setting; writes/removes Linux autostart desktop entry.
- `POST /api/local/action` — Linux hardware action.
- `POST /api/local/telemetry` — append validated telemetry events.
- `POST /api/local/telemetry/reset` — wipe telemetry, clear installId.

### Persistence (`src/server/persistence/localStore.ts`)
- Base dir: `.volttray/` (default), `0700`.
- `state.json` atomic write via `.tmp` then rename, `0600`.
- `telemetry.jsonl` append only when `consented && installId`; payloads filtered by `validatePayloadSafety`.
- Telemetry capped at 1000 events.
- Corrupt/missing state falls back to defaults.

## 7. Key Modules

| Area | File(s) | Notes |
|---|---|---|
| UI shell | `src/app/App.tsx` (~847L) | Main widget behavior; hotspot for future refactor. |
| Bridge | `src/platform/desktopBridge.ts` (~190L) | Runtime abstraction; swallows errors to keep UI resilient. |
| Shared types | `src/shared/types.ts` (~236L) | DTO contract; must stay aligned with Rust. |
| i18n/defaults | `src/shared/i18n.ts`, `defaults.ts` | Mongolian/English strings; initial settings/devices. |
| Battery logic | `src/features/battery/batteryMath.ts`, `deviceStatus.ts` | Thresholds, predictive estimates, status helpers; tested. |
| Notifications | `src/features/notifications/OverlayToast.tsx` | Component exists; active usage should be verified in UI flow. |
| Telemetry | `src/features/telemetry/analyticsEngine.ts` | Safety validation, bucketing, event helpers; no frontend wiring observed. |
| Linux probe | `src/server/hardware/linuxProbe.ts` (~1102L) | Largest hardware module; merge/provider orchestration hotspot. |
| Native desktop | `src-tauri/src/main.rs` (~304L) | Tray, window, command registration, cache. |

## 8. Tests & Quality Signals

### Observed
- **TS test files (8):** `batteryMath.test.ts`, `deviceStatus.test.ts`, `analyticsEngine.test.ts`, `deviceGroups.test.ts`, `linuxProbe.test.ts`, `kairpods.test.ts`, `m220.test.ts`, `listen.test.ts`.
- Test discovery: `npm test` recursively finds `src/**/*.test.ts`.
- Rust tests present inline by convention (`#[cfg(test)]` seen in `autostart.rs`).
- No TODO/FIXME/HACK grep hits in `src`, `src-tauri/src`, `scripts`, `docs/architecture.md`.

### Not executed in this scan
- `npm test` — **not run**.
- `npm run lint` — **not run**.
- `npm run build` — **not run**.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline` — **not run**.

## 9. Security / Privacy Notes

- **Local-first design:** local server bound through `listenLocalOnly`; desktop CSP restricts default/font/style sources.
- **No obvious cloud dependency in app runtime** from inspected files; README states no Gemini key.
- **Telemetry caution:** server/store/engine can handle telemetry, but no frontend consent/emission wiring observed in `App.tsx`, `desktopBridge.ts`, `main.tsx`. Do not claim active analytics emission without verification.
- **Data hygiene in telemetry engine:** blocks forbidden keys and email/MAC/path patterns; requires `$process_person_profile=false` and `$geoip_disable=true`.
- **Linux autostart:** browser fallback writes desktop entry under user config; Tauri has native autostart module. Review trust/command path behavior before release.
- **License ambiguity:** no LICENSE file; public source visibility does not equal open-source license.

## 10. Risks & Gaps

| Priority | Risk / Gap | Why it matters | Suggested action |
|---|---|---|---|
| P0 | Validation not run | Current build/test health unknown | Run lint/test/build/cargo test and record outcomes |
| P1 | No LICENSE | Legal usage/distribution unclear | Add explicit license or rights statement |
| P1 | No CI | Regressions can land silently | Add GitHub Actions for TS + Rust checks |
| P1 | Telemetry path ambiguous | Privacy/product claims may drift from implementation | Either wire end-to-end with consent UX or remove/mark dormant |
| P2 | Hotspot modules | `App.tsx`, `linuxProbe.ts` are large | Split by responsibility; add targeted tests |
| P2 | Dual-runtime drift | Tauri/server/bridge can diverge | Add parity/integration tests for bootstrap/state/action |
| P2 | Release posture unclear | No tags/releases evidenced; no LICENSE | Define release checklist and artifact policy |
| P3 | Docs vs behavior drift | Old reports/docs may describe past state | Mark historical docs and keep architecture/status current |

## 11. Untracked Work In This Workspace

### `docs/2026-11-15/telemetry-audit.md`
- Untracked audit note created during session. Treat as working document, not committed project history.

### `landing/` (marketing page)
- Static Mongolian landing page for VoltTray, built with `design-taste-frontend` skill assets.
- Key files: `landing/index.html`, `landing/plan.md`, `landing/assets/`, `landing/icon.png`, `landing/share.jpg`, `landing/shots/`.
- Design constraints followed: Mongolian copy, no fake proof/reviews/prices/downloads/releases, no license claim, primary CTA exact: **"Эх кодыг үзэх"** → `https://github.com/ZERO1zx1/VoltTray`.
- Font substitution: **Manrope + JetBrains Mono** instead of Host Grotesk (Cyrillic/Ө/Ү support).
- Checks (this session): copy-lint **0 FAIL / 1 WARN**; perf **0 FAIL / 4 WARN**; gate rounds **FAIL 41 → FAIL 25 → `GATE: OPEN 25 (rounds used up)`**. Logs: `/tmp/volt-gate.log`, `/tmp/volt-gate2.log`, `/tmp/volt-gate3.log`.
- Landing is separate from the Vite app root; do not overwrite root `index.html`.

## 12. Suggested Next Scan / Validation Pass

1. Run all build/test commands and append results here.
2. Review `src/server/http/listen.ts` and hardware action handlers for input/binding guarantees.
3. Confirm telemetry end-to-end behavior (or explicitly document inert state in README/docs).
4. Decide commit strategy for `landing/` and telemetry audit doc.
5. Add LICENSE + CI before external distribution/release claims.
