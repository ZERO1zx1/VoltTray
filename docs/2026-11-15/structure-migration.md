# Хавтасны бүтцийн шинэчлэл

2026-11-15. Кодыг үүргээр ангилж, relative import, npm script, TypeScript/Vite alias-ийг шинэчилсэн. Runtime өгөгдөл болон хуучин судалгааны нотолгоог зөөгөөгүй.

| Өмнөх зам | Одоогийн зам |
| --- | --- |
| `server.ts` | `src/server/main.ts` |
| `src-tauri/src/hardware.rs` | `src-tauri/src/hardware/mod.rs` |
| `src/App.tsx` | `src/app/App.tsx` |
| `src/components/DeviceIcon.tsx` | `src/features/battery/DeviceIcon.tsx` |
| `src/components/OverlayToast.tsx` | `src/features/notifications/OverlayToast.tsx` |
| `src/core/analyticsEngine.test.ts` | `src/features/telemetry/analyticsEngine.test.ts` |
| `src/core/analyticsEngine.ts` | `src/features/telemetry/analyticsEngine.ts` |
| `src/core/batteryMath.test.ts` | `src/features/battery/batteryMath.test.ts` |
| `src/core/batteryMath.ts` | `src/features/battery/batteryMath.ts` |
| `src/core/desktopBridge.ts` | `src/platform/desktopBridge.ts` |
| `src/core/deviceStatus.test.ts` | `src/features/battery/deviceStatus.test.ts` |
| `src/core/deviceStatus.ts` | `src/features/battery/deviceStatus.ts` |
| `src/core/i18n.ts` | `src/shared/i18n.ts` |
| `src/core/seedData.ts` | `src/shared/defaults.ts` |
| `src/core/types.ts` | `src/shared/types.ts` |
| `src/index.css` | `src/app/styles.css` |
| `src/server/hardwareProbe.test.ts` | `src/server/hardware/linuxProbe.test.ts` |
| `src/server/hardwareProbe.ts` | `src/server/hardware/linuxProbe.ts` |
| `src/server/linuxControls.ts` | `src/server/hardware/linuxControls.ts` |
| `src/server/localServer.ts` | `src/server/http/listen.ts` |
| `src/server/localServerBinding.test.ts` | `src/server/http/listen.test.ts` |
| `src/server/localStore.ts` | `src/server/persistence/localStore.ts` |
| `src/server/providers/kairpods.test.ts` | `src/server/hardware/providers/kairpods.test.ts` |
| `src/server/providers/kairpods.ts` | `src/server/hardware/providers/kairpods.ts` |

Шинэ заавар: [архитектур](../architecture.md).

## Баталгаажуулалт

- `npm run lint`: PASS.
- `npm test`: 23 тест PASS, 0 failure; 6 файлыг автоматаар олсон.
- `npm run build`: PASS.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`: 3 тест PASS.
- `npm run dev`-ийг түр `43177` порт дээр ажиллуулж HTML болон React entry point HTTP 200 буцаахыг шалгасан; шалгалтын дараа процессыг хаасан.
- Шилжүүлсэн 24 файлын шинэ зам байгаа, хуучин зам үлдээгүй; одоогийн зааврын локал холбоосууд хүчинтэй.
- Энэ бүтцийн өөрчлөлтийн дараа native installer дахин багцлаагүй; өмнөх `.deb` artifact хэвээр.
