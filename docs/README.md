# Баримт бичгийн индекс

- [Desktop build ба Linux тохиргоо](desktop-build.md) — хөгжүүлэлт, release build, Linux-ийн нэмэлт тохиргоо.
- [Төслийн бүтэц](#төслийн-бүтэц) — эх код болон үүсдэг файлуудын үүрэг.
- [Бүтээгдэхүүний материал](product/) — UI дизайн болон analytics tracking төлөвлөгөө. Эдгээр материал build-д орохгүй.
- [Архив](archive/) — AI Studio-гийн хуучин metadata. Desktop аппын runtime-д ашиглагдахгүй.
- [Скан тайлан](2026-11-14/reports/strict/report.md) — тухайн өдрийн Strict scan.
- [AirPods ашиглах](airpods.md) — kAirPods service ба зүүн/баруун/кейсийн цэнэг.
- [Valkyrie VK M3 Lite батарей](m220.md) — Linux USB/2.4GHz уншилт, эрх, нэг хулганын хоёр холболтыг нэгтгэх.
- [USB гар/хулганын танилт](2026-11-15/usb-identification.md) — lsusb/HID нотолгоо, танилтын засвар, btop++ fork.
- [Дөрвөн GitHub төслийн судалгаа](2026-11-15/reports/deep-research/report.md) — эх кодын харьцуулалт ба хэрэгжүүлсэн өөрчлөлт.

## Төслийн бүтэц

[Архитектурын заавар](architecture.md) нь хавтасны зураг, модуль хоорондын хамаарал, шинэ файл байрлуулах дүрэм, үүсдэг файлуудын тайлбарыг агуулна.

| Үндсэн хавтас | Үүрэг |
| --- | --- |
| `src/app/` | Widget дэлгэц, style |
| `src/features/` | Battery, notification, telemetry модулиуд ба зэрэгцээ тест |
| `src/shared/` | Нийтлэг төрөл, defaults, орчуулга |
| `src/platform/` | Frontend → native/local API зааг |
| `src/server/` | Browser fallback сервер, hardware, HTTP, persistence |
| `src-tauri/` | Desktop Rust runtime ба багцлалтын тохиргоо |
| `scripts/` | Хөгжүүлэлт/суулгалтын командууд |
| `docs/` | Заавар, бүтээгдэхүүний материал, огноотой тайлан |

[Хуучин → шинэ файлын зам](2026-11-15/structure-migration.md). Огноотой тайлангийн хуучин замуудыг тухайн үеийн нотолгоо болгон хадгалсан.
