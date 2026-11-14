# VoltTray — Strict scan

**Огноо:** 2026-11-14  
**Хамрах хүрээ:** React/Vite UI, browser fallback сервер, Tauri native код, Node/Rust dependency manifests, build/install скриптүүд болон хэрэглэгчийн баримт бичиг.  
**Горим:** Strict.  
**Нууцлал:** `.volttray/state.json`-ийн агуулгыг тайланд оруулаагүй.

## Товч дүгнэлт

Локал web сервер бүх network interface дээр сонсож байсан, TypeScript шалгалт Tauri-ийн үүсгэсэн binary JavaScript файлуудыг уншдаг байсан, Node dependency болон desktop build setup хоорондоо нийцэхгүй байв. Эдгээрийг loopback bind, `tsconfig` exclude, lockfile болон Tauri CLI тохиргоогоор засав. AppImage-ийн autostart замыг мөн тогтвортой AppImage файлыг заадаг болгож regression тест нэмэв.

Source болон docs материалыг цэгцэлж, README-г Монгол хэлээр шинэчилсэн. Linux native binary болон `.deb` багц амжилттай build хийгдсэн. AppImage build GitHub-аас runtime татах үеэр сүлжээний хязгаарлалтад зогсов; энэ орчинд AppImage үүсээгүй. Build-ийн үеэр өмнө байсан ignored AppImage файл цэвэрлэгдсэн бөгөөд ижил файлын нөөц хуулбар олдоогүй.

## Олдворууд

### [1] Локал API сүлжээний бүх хаягт нээлттэй байсан — зассан
- **Location:** `server.ts:196`, `src/server/localServer.ts:4`
- **Severity:** MEDIUM
- **Class:** UNKNOWN
- **Root Cause proven:** Эхний хувилбар серверээ `0.0.0.0` дээр сонсгож, authentication-гүй `/api/local/autostart`, `/api/local/action`, `/api/local/state`, `/api/local/telemetry` route-уудыг нээсэн. `action` нь Linux микрофон, LED болон DPI тохиргоонд хүрч болно.
- **Root Cause hypoth.:** Өөр төхөөрөмжөөс хүрэх боломж firewall болон тухайн сүлжээний тохиргооноос хамаарна.
- **Confidence:** 0.99
- **Impact:** Scope=browser fallback сервер | Blast=локал төхөөрөмжийн удирдлага ба тохиргоо | Timing=сервер ажиллаж байх хугацаанд | Recovery=серверийг зогсоож, өөрчилсөн тохиргоог буцаах
- **Reproduce:** `nl -ba server.ts | sed -n '190,200p'; node --import tsx src/server/localServerBinding.test.ts`
- **Fix:** `src/server/localServer.ts:9` Express listener-ийг `127.0.0.1` дээр bind болгодог болгож, `server.ts` уг helper-ийг ашиглана. Tauri `devUrl` мөн `127.0.0.1` болсон.
- **Re-validate:** `npm test`
- **Expected / Actual:** Зөвхөн loopback интерфэйст сонсох / кодын шалгалтаар loopback сонгосон. Бодит socket нээх үйлдлийг sandbox `EPERM`-ээр хориглосон.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** `src/server/localServerBinding.test.ts` нь Express-ийн `listen` аргумент дахь host-г шалгана; тест ногоон.
- **Boundary Note:** Runtime socket болон LAN-аас хандах боломжийг энэ workspace-д туршаагүй.

### [2] TypeScript шалгалт үүсмэл Tauri файлуудад унаж байсан — зассан
- **Location:** `tsconfig.json:27`
- **Severity:** MEDIUM
- **Class:** TEST FAILURE
- **Root Cause proven:** `allowJs` идэвхтэй, харин exclude-д зөвхөн `dist` байснаар `src-tauri/target/**` доторх Tauri codegen `.js` binary файлууд compiler-ийн оролт болсон. Эхний `npm run lint` олон `TS1490`/`TS1127` алдаа гаргасан.
- **Root Cause hypoth.:** Үүсмэл `.js` файлуудыг дараа нь дахин typecheck-д хамруулах шаардлага байхгүй.
- **Confidence:** 1.0
- **Impact:** Scope=lint/typecheck | Blast=CI болон хөгжүүлэлтийн шалгалт | Timing=Tauri target үүссэн үед | Recovery=`src-tauri/target`-ийг compiler exclude-д оруулах
- **Reproduce:** `npm run lint` (засварын дараа амжилттай; анхны run-д үүсмэл файл дээр унасан)
- **Fix:** `tsconfig.json`-ийн exclude-д `src-tauri/target` нэмэв.
- **Re-validate:** `npm run lint`
- **Expected / Actual:** Maintained TS/TSX эх код шалгагдаж target алгасах / exit code `0`.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Эхний compiler output дахь `TS1490` алдаанууд; засварын дараах `npm run lint` exit `0`.
- **Boundary Note:** —

### [3] npm dependency болон desktop build toolchain зөрж байсан — зассан
- **Location:** `package.json:2-38`, `package-lock.json`
- **Severity:** MEDIUM
- **Class:** TEST FAILURE
- **Root Cause proven:** Root manifest `esbuild ^0.25.0` зааж байсан ч суусан Vite 8.3.8 нь optional peer хэлбэрээр esbuild `^0.27.0 || ^0.28.0` шаардсан; offline lock шинэчлэх үед `ERESOLVE` гарсан. Tauri CLI script `npx`-ээр татдаг мөртлөө төсөлд dependency байдлаар бүртгэлгүй, `npm test` command ч байгаагүй.
- **Root Cause hypoth.:** Хуучин AI Studio template-ээс үлдсэн dependency/скриптүүд төслийн өнөөгийн desktop зорилготой таараагүй.
- **Confidence:** 0.99
- **Impact:** Scope=суулгалт, тест, release build | Blast=шинэ checkout дээр build эхлүүлэх | Timing=dependency install/build хийх үед | Recovery=manifest ба lockfile-г нэг хувилбарт тааруулах
- **Reproduce:** `npm install --package-lock-only --offline --no-audit --no-fund` (анхны manifest дээр `ERESOLVE`)
- **Fix:** `esbuild`-ийг `^0.28.0` болгож, Tauri CLI `^2.12.4`-ийг devDependency-д, `tsx`-ийг runtime dependency-д оруулав. `test`, `tauri:dev`, `tauri:build` скрипт нэмэв; ашиглагдаагүй Gemini/`dotenv` dependency-г хасав.
- **Re-validate:** `npm ci --ignore-scripts --offline --no-audit --no-fund && npm ls --depth=0`
- **Expected / Actual:** Lockfile-оос цэвэр суулгалт, local Tauri CLI ашиглах / суулгалт болон dependency tree exit `0`.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** `npm ci` exit `0`; `npm ls` дээр `@tauri-apps/cli@2.12.4`, `esbuild@0.28.2`.
- **Boundary Note:** Шинэ package таталгүй, боломжтой локал npm cache-ийг ашигласан.

### [4] AppImage autostart түр mount-ийн executable-г зааж байсан — зассан
- **Location:** `src-tauri/src/autostart.rs:42-50,63-67,122-154`
- **Severity:** MEDIUM
- **Class:** TEST FAILURE
- **Root Cause proven:** Linux autostart үүсгэхдээ үргэлж `current_exe()` ашигладаг байсан. AppImage payload нь түр mount дотроос ажилладаг; AppImage-ийн `APPIMAGE` хувьсагч гаднах тогтвортой image файлын замыг өгдөг, mount нь ажил дуусахад цэвэрлэгддэг. [AppImage environment docs](https://docs.appimage.org/packaging-guide/environment-variables.html), [architecture docs](https://docs.appimage.org/reference/architecture.html) — 2026-11-14-нд шалгав.
- **Root Cause hypoth.:** Анхны AppImage-с үүссэн login entry дараагийн login-д ажиллахгүй байх магадлалтай.
- **Confidence:** 0.96
- **Impact:** Scope=Linux AppImage autostart | Blast=login үеийн автомат эхлэлт | Timing=AppImage-аас анх ажиллуулах үед | Recovery=AppImage-г нээгээд autostart-ыг дахин хадгалах
- **Reproduce:** `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline` (шинэ regression тест өмнө нь red байсан; одоо green)
- **Fix:** Linux орчинд `APPIMAGE` байгаа бол түүнийг, үгүй бол `current_exe()`-г ашигладаг болгов.
- **Re-validate:** `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`
- **Expected / Actual:** Autostart executable нь AppImage файлыг заах / шинэ Rust regression тест pass.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Тестийн эхний run `current_exe()` замтай тул fail болсон; засварын дараа 1 Rust тест pass.
- **Boundary Note:** Бодит AppImage autostart-ыг desktop session дотор туршаагүй.

### [5] README-д Gemini API key шаарддаг гэж буруу заасан байсан — зассан
- **Location:** `README.md:1-20`, `package.json:18-38`
- **Severity:** LOW
- **Class:** UNKNOWN
- **Root Cause proven:** README өмнө `.env.local` болон `GEMINI_API_KEY` шаардсан, харин сервер/аппын код API key болон Gemini SDK ашиглаагүй. `dotenv`-г мөн импортлоогүй.
- **Root Cause hypoth.:** README, package нэр болон `metadata.json` нь AI Studio template-ийн хуучин хувилбар байсан.
- **Confidence:** 0.99
- **Impact:** Scope=анхны суулгалтын заавар | Blast=шинэ developer | Timing=setup хийх үед | Recovery=зөв local desktop зааврыг дагах
- **Reproduce:** `rg -n 'GEMINI_API_KEY|@google/genai|dotenv' README.md package.json src server.ts`
- **Fix:** README-г Монгол хэлээр desktop зорилгод тааруулж шинэчлэн, хуучин metadata-г `docs/archive/` руу зөөв; төслийн нэр, version-г `volttray@1.0.0` болгов.
- **Re-validate:** `npm ci --ignore-scripts --offline --no-audit --no-fund`
- **Expected / Actual:** Gemini key хэрэггүй зөв заавар / README одоо `npm ci`, `npm run tauri:dev`, `npm run tauri:build` заана.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Одоогийн кодод `GEMINI_API_KEY` ашиглалт байхгүй; README шинэчилсэн.
- **Boundary Note:** —

### [6] Дизайн ба tracking баримтууд `public/` дотор байсан — зассан
- **Location:** `public/assets/` (шилжүүлсэн)
- **Severity:** LOW
- **Class:** UNKNOWN
- **Root Cause proven:** Ашиглагдаагүй UX зураг болон analytics tracking plan-ууд Vite-ийн `public` статик хавтас дотор байсан тул runtime build руу хуулж байв.
- **Root Cause hypoth.:** Эдгээр нь UI-д хэрэглэх runtime asset бус, бүтээгдэхүүний материал юм.
- **Confidence:** 0.98
- **Impact:** Scope=production bundle | Blast=хэрэглэгчдэд ил гарах дотоод материал ба bundle хэмжээ | Timing=Vite build хийхэд | Recovery=баримтуудыг docs-д байлгаж, `public/`-д runtime asset л үлдээх
- **Reproduce:** `find docs/product -type f -maxdepth 3 -print`
- **Fix:** Материалыг `docs/product/design/` болон `docs/product/tracking/` руу зөөж, `public/`-ийг арилгав.
- **Re-validate:** `npm run build`
- **Expected / Actual:** Баримтууд `dist` руу хуулж гарахгүй / build pass; docs нь `docs/product/` дотор.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Эх сурвалж материалууд runtime import/reference байгаагүй; шинэ production build зөвхөн HTML/CSS/JS гаргасан.
- **Boundary Note:** Файлын агуулгыг тайланд ил гаргаагүй.

### [7] UI ачаалахдаа Google Fonts руу хүсэлт явуулдаг байсан — зассан
- **Location:** `index.html:1-28`, `src-tauri/tauri.conf.json:26-28`
- **Severity:** LOW
- **Class:** UNKNOWN
- **Root Cause proven:** HTML `fonts.googleapis.com` stylesheet болон `fonts.gstatic.com` руу preconnect хийж, Tauri CSP эдгээр хостыг зөвшөөрсөн.
- **Root Cause hypoth.:** Зорилтот app нь local desktop тул сүлжээгүй үед UI өөрийн system font fallback ашиглан ажиллах ёстой.
- **Confidence:** 0.98
- **Impact:** Scope=UI initialization | Blast=гадаад font request ба offline UI | Timing=апп нээгдэхэд | Recovery=Google Fonts холбоосыг хасаж self/system font ашиглах
- **Reproduce:** `rg -n 'fonts\.googleapis|fonts\.gstatic' index.html src-tauri/tauri.conf.json`
- **Fix:** Гадаад font холбоос болон CSP host зөвшөөрлийг хасав; CSS-ийн системийн fallback хэвээр.
- **Re-validate:** `npm run build`
- **Expected / Actual:** UI гаднын font fetch хийхгүй / CSP зөвхөн self эх үүсвэр зөвшөөрч build pass.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Одоогийн `index.html`-д Google Fonts URL байхгүй; Vite production build pass.
- **Boundary Note:** —

### [8] Локал өгөгдөл болон Rust build target ignore хийгдээгүй байсан — зассан
- **Location:** `.gitignore:1-8`
- **Severity:** LOW
- **Class:** UNKNOWN
- **Root Cause proven:** Эхний `.gitignore` `.volttray/` болон `src-tauri/target/`-ийг агуулаагүй. `.volttray/state.json` нь локал тохиргооны файл байв.
- **Root Cause hypoth.:** Git repository-г нээх/үүсгэх үед local state болон том build output санамсаргүйгээр нэмэгдэх эрсдэлтэй.
- **Confidence:** 0.95
- **Impact:** Scope=source control hygiene | Blast=локал state ба build артефакт | Timing=Git add хийхэд | Recovery=хавтсуудыг ignore хийж, хэрэв өмнө track болсон бол index-ээс гаргах
- **Reproduce:** `cat .gitignore; ls -la .volttray`
- **Fix:** `.volttray/` болон `/src-tauri/target/`-ийг `.gitignore`-д нэмэв.
- **Re-validate:** `rg -n '^\.volttray/|^/src-tauri/target/' .gitignore`
- **Expected / Actual:** State болон target ignore хийгдэнэ / хоёр дүрэм нэмэгдсэн.
- **Status:** FIXED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** `.volttray` хавтас `700`, `state.json` файл `600` permission-тэй байсан; Git baseline байгаагүй.
- **Boundary Note:** `.git/` хоосон байсан тул файл өмнө track болсон эсэхийг тогтоох боломжгүй.

### [9] AppImage гаргах үеийн runtime таталт сүлжээгээр хязгаарлагдсан — BLOCKED
- **Location:** `src-tauri/tauri.conf.json:30-33`
- **Severity:** MEDIUM
- **Class:** ENV FAILURE
- **Root Cause proven:** `linuxdeploy` AppImage plugin `https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-x86_64` руу runtime татах үед `Failed to download runtime: server returned status code 0` гэж унасан. Workspace network access restricted.
- **Root Cause hypoth.:** Сүлжээ зөвшөөрдөг build орчинд AppImage target бүрэн гарна.
- **Confidence:** 1.0
- **Impact:** Scope=Linux AppImage package | Blast=AppImage файлыг өгөх/ажиллуулах | Timing=AppImage packaging алхамд | Recovery=GitHub runtime татах боломжтой орчинд build дахин ажиллуулах
- **Reproduce:** `npm run tauri:build -- --bundles appimage --verbose`
- **Fix:** Сүлжээ нээлттэй build орчинд runtime-г татаж AppImage-г дахин үүсгэх. Одоогийн орчинд `.deb` хувилбар: `npm run tauri:build -- --bundles deb`.
- **Re-validate:** `npm run tauri:build -- --bundles appimage`
- **Expected / Actual:** `VoltTray_1.0.0_amd64.AppImage` үүсэх / runtime download дээр бүтэлгүйтэв. Энэ алхмаас өмнөх ignored AppImage артефакт цэвэрлэгдсэн; хуулбар олдоогүй.
- **Status:** BLOCKED
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Tauri verbose build output дахь AppImage runtime download алдаа; `.deb`-ийн тусдаа build exit `0`.
- **Boundary Note:** Network/remote dependency boundary. `dpkg-deb` команд бас суулгаагүй; `.deb`-ийг `file` ба `ar t`-ээр archive package гэж таньсан ч control/data metadata-г задлан шалгаагүй.

### [10] Rust format шалгалт хоёр өөрчлөгдөөгүй файл дээр зөрүү илрүүлэв
- **Location:** `src-tauri/src/hardware.rs:55,83,514,555`; `src-tauri/src/main.rs:75`
- **Severity:** LOW
- **Class:** TEST FAILURE
- **Root Cause proven:** `cargo fmt --check` автоматаар форматлах шаардлагатай мөрүүдийг дээрх эх файлд гаргасан. Тэд энэ ажлын өөрчлөлтөд ороогүй.
- **Root Cause hypoth.:** Эдгээр зөрүү нь runtime build эсвэл unit test-д нөлөөлөхгүй; format gate тусдаа тохируулагдаагүй.
- **Confidence:** 0.98
- **Impact:** Scope=Rust formatting | Blast=код унших/формат жигд байдал | Timing=formatter check хийхэд | Recovery=diff-ийг хянаад `cargo fmt` ажиллуулах
- **Reproduce:** `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- **Fix:** `cargo fmt --manifest-path src-tauri/Cargo.toml` (ажлын хүрээнд эдгээр хоёр файлыг автоматаар өөрчлөөгүй).
- **Re-validate:** `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- **Expected / Actual:** Rust formatter clean / энэ шалгалт exit `1`; Rust build/test амжилттай.
- **Status:** STATIC-RISK
- **Proposed by:** ai-agent
- **Confirmed by:** PENDING
- **Evidence:** Formatter output нь зөвхөн `hardware.rs`, `main.rs` заасан.
- **Boundary Note:** `.git/` хоосон тул эдгээр мөр дээрх хэрэглэгчийн өмнөх өөрчлөлтийн baseline байхгүй; автоматаар форматлаж өгөөгүй.

## Шалгалтын дүн

| Шалгалт | Дүн |
| --- | --- |
| `npm ci --ignore-scripts --offline --no-audit --no-fund` | PASS |
| `npm ls --depth=0` | PASS; root dependency дутуу/invalid гараагүй |
| `npm run lint` | PASS |
| `npm test` | PASS; 4 Node test file, 0 fail |
| `npm run build` | PASS |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline` | PASS; 1 Rust test, 0 fail |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | FAIL; дээрх хоёр өөрчлөгдөөгүй Rust файл |
| `npm run tauri:build -- --bundles deb` | PASS; ELF native binary ба 1.55 MiB `.deb` гарсан |
| `npm run tauri:build -- --bundles appimage --verbose` | ENV BLOCKED; GitHub runtime таталт fail |

## Гараар ажиллуулж шалгах командууд

Repository root-оос:

```bash
npm ci
npm test
npm run lint
npm run tauri:dev
npm run tauri:build
```

Сүлжээний хязгаарлалттай Linux build орчинд:

```bash
npm run tauri:build -- --bundles deb
```

## Өөрчлөгдсөн файлууд

- Source/config: `.gitignore`, `index.html`, `package.json`, `package-lock.json`, `server.ts`, `tsconfig.json`, `vite.config.ts`, `src/server/localServer.ts`, `src/server/localServerBinding.test.ts`, `src-tauri/src/autostart.rs`, `src-tauri/tauri.conf.json`.
- Docs: `README.md`, `docs/README.md`, `docs/desktop-build.md`, `docs/archive/ai-studio-metadata.json`, `docs/product/design/*`, `docs/product/tracking/*`, `docs/2026-11-14/README.md`, `docs/2026-11-14/reports/strict/report.md`, `report.json`.
- Зөөсөн/арилсан хуучин замууд: `DESKTOP_BUILD.md`, `metadata.json`, `public/assets/*`, `public/`.
- Үүсмэл: `dist/`, `src-tauri/target/release/volttray`, `.deb`, AppImage AppDir шинэчлэгдсэн. Өмнө байсан AppImage файл packaging алдааны өмнө цэвэрлэгдсэн бөгөөд сэргээх хуулбар олдоогүй.

## Үлдсэн хязгаарлалтууд

- AppImage runtime татахын тулд GitHub сүлжээ хэрэгтэй.
- Workspace sandbox бодит localhost socket нээхэд `EPERM` өгсөн; listener host-г unit test-ээр шалгав.
- Tauri GUI-г энэ орчинд ажиллуулж хараагүй. Windows installer болон бодит hardware probe-г энэ Linux орчинд туршаагүй.
- `.git/` хавтас хоосон тул branch болон хэрэглэгчийн өмнөх tracked diff тодорхойгүй.
