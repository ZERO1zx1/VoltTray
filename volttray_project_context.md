# VoltTray — Төслийн бүрэн мэдээлэл ба контекст

## 1. Ерөнхий мэдээлэл ба Git төлөв
- **Бүтээгдэхүүн:** VoltTray (Хувилбар `1.0.0`) — Windows болон Linux-д зориулсан локал десктоп батерей болон нэмэлт төхөөрөмжийн tray монитор.
- **Локал зам:** `/home/light/Projects/battery`
- **GitHub репо:** `https://github.com/ZERO1zx1/VoltTray`
- **Git төлөв:** `main...origin/main`
  - Сүүлийн commit: `e103c12 Initial commit: VoltTray battery tray app for Windows and Linux`
  - Track хийгдээгүй файлууд: `docs/2026-11-15/telemetry-audit.md`, `landing/`
- **Лиценз ба CI:** `LICENSE`/`COPYING` файл байхгүй; `.github/` дотор CI workflow байхгүй.

---

## 2. Одоогийн технологийн стек ба ажиллах орчин
- **Frontend:** React 19, Vite 8, Tailwind 4, `lucide-react`, `motion`. Эхлэх цэг: `index.html` → `src/main.tsx` → `src/app/App.tsx`.
- **Локал сервер / Нөөц хувилбар:** Express 4 + TSX (`src/server/main.ts`, порт `127.0.0.1:3000`, `express.json` 256kb).
  - API маршрутууд: `/api/health`, `/api/local/bootstrap`, `/api/local/stream` (SSE 1.5s), `/api/local/state`, `/api/local/autostart`, `/api/local/action`, `/api/local/telemetry`, `/api/local/telemetry/reset`.
  - Dev орчинд Vite middleware, prod орчинд `dist/` түгээнэ.
- **Десктоп (Tauri 2):** `src-tauri/`, `tray-icon` функцтэй.
  - CSP: `default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'`.
  - Багцлалт: `nsis`, `msi`, `deb`, `appimage`; Linux `udev` дүрмүүд багтсан.
  - Rust release профайл: `abort`, `LTO`, `opt-level = "s"`, `strip`.
- **Платформын гүүр (`src/platform/desktopBridge.ts`):** Tauri `__TAURI_INTERNALS__.invoke` эсвэл локал HTTP/SSE-г автоматаар сонгож, алдаа гарвал зөөлөн шилжилт (graceful fallback) хийнэ.
- **Хадгалалт (`LocalDiskStore`):** `.volttray/` хавтас (`0700` хавтас, `0600` файл), атомик JSON хадгалалт (`.tmp` нэр солих), телеметрийн JSONL 1000 мөрөөр хязгаарлагдсан.

### Үндсэн командууд
- `npm ci`
- `npm run dev` / `npm run start` (локал сервер)
- `npm run tauri:dev` / `npm run tauri:build`
- `npm run build`
- `npm run lint` (`tsc --noEmit`)
- `npm test` (`node scripts/test.mjs` — `src/**/*.test.ts` файлуудыг автоматаар илрүүлнэ)
- `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`
- `npm run clean` (зөвхөн `dist`)

---

## 3. Кодын бүтэц ба архитектурын зураглал

| Давхарга | Гол файлууд | Үүрэг ба онцлог |
|---|---|---|
| **UI апп** | `src/app/App.tsx` (~847 мөр), `src/main.tsx`, `styles.css` | Виджетийн төлөв, bootstrap/refresh, pin/autostart, демо горим, цэнэг багассан мэдэгдэл, төхөөрөмжийн дүрслэл. |
| **Дундын гэрээ** | `src/shared/types.ts` (~236 мөр), `defaults.ts`, `i18n.ts` | TS/Rust дамжсан DTO, анхдагч утга, `mn`/`en` UI текстүүд. |
| **Батерей/домэйн** | `src/features/battery/batteryMath.ts`, `deviceStatus.ts`, `DeviceIcon.tsx` | Үлдсэн цаг таамаглах, RGB/унтах горим/цэнэгийн хязгаарлах логик + тестүүд. |
| **Мэдэгдэл** | `src/features/notifications/OverlayToast.tsx` | Компонент байгаа ч идэвхтэй холболт бүрэн баталгаажаагүй. |
| **Телеметри** | `src/features/telemetry/analyticsEngine.ts` + тест | Аюулгүй байдлын шүүлтүүртэй боловч frontend талд зөвшөөрөл/илгээлт холбогдоогүй (унтаа/идэвхгүй төлөвтэй). |
| **Сервер техник хангамж** | `src/server/hardware/linuxProbe.ts` (~1102 мөр), `linuxControls.ts`, `deviceGroups.ts` | Linux probe, удирдлага, бүлэглэлт болон провайдерууд (`kAirPods` D-Bus, `USB identity`, `M220` HID). |
| **Tauri Rust** | `src-tauri/src/main.rs` (~304 мөр), `hardware/*`, `autostart.rs`, `linux_controls.rs` | Native командууд (`get_local_bootstrap`, `save_local_state`, `set_autostart`, `set_widget_pinned`, `hide_widget`, `run_linux_hardware_action`), tray цэс ба анхны асаалтын autostart. |
| **Баримт бичиг** | `docs/README.md`, `architecture.md`, `desktop-build.md`, `airpods.md`, `m220.md`, `usb-identification.md` | Архитектур, build заавар, төхөөрөмж тус бүрийн техникийн баримтууд. |

**Өгөгдлийн урсгал:** `UI` → `desktopBridge` → `Tauri commands` эсвэл `Local HTTP/SSE` → Hardware probe / `.volttray` локал хадгалалт.

---

## 4. Чанар, эрсдэл ба баталгаажаагүй зүйлс

### Давуу талууд
- **Local-first зарчим:** Зөвхөн loopback сервер, локал хадгалалт, хатуу CSP, үүлэн хамааралгүй.
- **Тестийн суурь:** 8 TS тестийн файл, Rust тестүүд (`#[cfg(test)]`), `TODO`/`FIXME` үлдэгдэлгүй.
- **Аюулгүй хадгалалт:** Хязгаарлагдмал дискний хэрэглээ, `0700`/`0600` хандах эрх.

### Эрсдэл ба дутагдлууд
- **Бодит runtime/build шалгалт хийгдээгүй:** Статик шалгалт л хийгдсэн тул `npm test`, `npm run lint`, `npm run build`, `cargo test`-ийг бодитоор ажиллуулж баталгаажуулах шаардлагатай.
- **Том модулиуд (Hotspots):** `App.tsx` (~847 мөр) болон `linuxProbe.ts` (~1102 мөр) арчилгаа, тестлэхэд хүндрэлтэй.
- **Хос runtime зөрүү (Parity drift):** TS болон Rust DTO-г байнга синхрон байлгах шаардлагатай; parity тест дутуу.
- **Телеметрийн тодорхойгүй байдал:** Сервер болон хөдөлгүүр байгаа ч клиент талын урсгал байхгүй тул идэвхгүй гэдгийг тодорхой болгох эсвэл устгах/бүрэн холбох шийдвэр шаардлагатай.
- **Лиценз ба CI байхгүй:** Хууль эрх зүйн статус тодорхойгүй, автомат шалгалт байхгүй.
- **Оролтын аюулгүй байдал:** `linuxControls.ts` болон native action боловсруулагчдын оролтын шалгалтыг мөр бүрчлэн нягтлах шаардлагатай.

---

## 5. Шинэ Native стек рүү шилжих судалгаа (WebView-ийн оронд)

Tray widget байнга цаана ажилладаг тул WebView (`WebKitGTK` / WebView2) нь илүү RAM зарцуулж, хос runtime-ийн зөрүү үүсгэдэг. Оронд нь дараах Rust native сонголтуудыг харьцуулсан:

| Сонголт | UI загвар | Одоогийн Rust логикийг ашиглах | Windows + Linux тэнцвэр | Тайлбар |
|---|---|---|---|---|
| **Rust + `slint`** | Декларатив (`.slint`) | Маш сайн (нэг бинар) | Сайн | Цэвэр, гоёмсог widget UI + нэг хэлний бүтэц хүсвэл хамгийн тэнцвэртэй сонголт. |
| **Rust + `egui` (`eframe`)** | Immediate-mode Rust | Маш сайн | Сайн | Хамгийн хурдан прототип, хөнгөн, техникийн хяналтын самбарт тохиромжтой. |
| **Rust + `iced`** | Elm (MVU) Rust | Маш сайн | Сайн | Төлөвийн урсгал цэвэр боловч API хувилбараас хувилбарт өөрчлөгдөх хандлагатай. |
| **Rust + `gtk4-rs` / `relm4`** | GTK4 / Native Linux | Сайн | Linux илүү давуу | Linux/GNOME орчинд хамгийн native мэдрэмжтэй боловч Windows багцлалт илүү төвөгтэй. |

---

## 6. Батлагдсан UI/UX бүтэц (Tray Popover Widget)
1. **Толгой хэсэг (`Header`):**
   - `VoltTray` нэр, ажиллах горимын тэмдэг (`Tauri Desktop` / `Local HTTP` эсвэл `Native`).
   - Хурдан товчнууд: `Refresh`, `Pin`, `Autostart`, `MN / EN` хэл солигч.
2. **Төхөөрөмжийн картууд (`Device Cards`):**
   - Системийн батерей (`Sysfs`), `kAirPods` (Зүүн/Баруун/Хайрцаг), `Logitech M220`, `USB/HID` төхөөрөмжүүд.
   - Карт бүрд: дүрс, нэр, холболтын суваг (`Sysfs`, `D-Bus`, `USB / HID`), батерейны хувь + өнгөний төлөвтэй progress bar, төлөв + үлдсэн цагийн таамаглал, сүүлд шинэчлэгдсэн хугацаа (`lastSeen`).
3. **Сонгосон төхөөрөмжийн дэлгэрэнгүй хэсэг (`Device Detail Panel`):**
   - Төхөөрөмж дээр дарахад холболтын дэлгэрэнгүй, цэнэгийн таамаглал болон дэмжигдсэн Linux удирдлагууд (charge limit, RGB, sleep) харагдана.
4. **Мэдэгдэл ба доод хэсэг (`Alerts & Footer`):**
   - Цэнэг багасах / холболт тасрах үеийн анхааруулгын зурвас (`OverlayToast` нэгтгэл).
   - `.volttray` зөвхөн локал горимын тэмдэг, `Demo Mode` шилжүүлэгч, `Hide` / `Quit` товчнууд.

---

## 7. Landing Page (`landing/`) төлөв
- **Байршил:** `landing/` (track хийгдээгүй, үндсэн аппаас тусдаа).
- **Агуулга:** Монгол хэл дээрх VoltTray танилцуулга (`index.html`, `plan.md`, `assets/`, `icon.png`, `share.jpg`, `shots/`), sage/forest-pale-lime палет, Manrope + JetBrains Mono фонт, хуурамч тоо баримт/лицензийн амлалтгүй, үндсэн CTA “Эх кодыг үзэх” → `https://github.com/ZERO1zx1/VoltTray`.
- **Шалгалтын төлөв:** `copy-lint` 0 FAIL / 1 WARN; `perf` 0 FAIL / 4 WARN; `GATE: OPEN 25`.
- **Засах шаардлагатай гол зүйлс:** FAQ өндөр/хэмнэл/давхцал, алхмууд болон FAQ-ийн визуал тэнцвэр, виджетийн давхарлалт/ирмэг, контраст ба `focus-visible`, гарчгийн шатлал.
- **Зорилго:** `https://github.com/ZERO1zx1/VoltTray` репо дээр GitHub Pages-ээр байршуулах.

---

## 8. Эрэмбэлсэн дараагийн алхмууд (P0–P4)
- **P0 — Нотолгоо:** `npm test`, `npm run lint`, `npm run build`, `cargo test` ажиллуулж бодит суурь төлөвийг баталгаажуулах.
- **P1 — Тодорхой байдал ба аюулгүй байдал:** `LICENSE` болон CI workflow (`.github/workflows/`) нэмэх; `listenLocalOnly`, `linuxControls.ts` оролтын шалгалт, Tauri capability-г аудит хийх.
- **P2 — Бүтээгдэхүүний үнэн бодит байдал:** Телеметрийг нэг мөр болгох (устгах эсвэл зөвшөөрөл+илгээлтийг бүрэн холбох); хос runtime-ийн parity тест нэмэх (хэрэв Tauri хэвээр үлдвэл).
- **P3 — Бүтэц / Шилжилт:** Одоогийн `App.tsx` болон `linuxProbe.ts`-ийг салгах, эсвэл **Rust + Slint** native апп руу үе шаттай шилжүүлэх.
- **P4 — Landing ба түгээлт:** `landing/`-ийн gate OPEN асуудлуудыг засаж, GitHub Pages дээр байршуулах.