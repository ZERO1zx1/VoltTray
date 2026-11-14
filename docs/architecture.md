# Төслийн бүтэц ба кодын эзэмшил

VoltTray нь нэг React интерфэйстэй, хоёр runtime-тай: Tauri desktop болон хөгжүүлэлтэд ашиглах Node browser fallback. Файлыг үүргээр нь байрлуулна; шинэ feature бүрд бүх давхаргыг хуулж үүсгэх шаардлагагүй.

```text
battery/
├── src/
│   ├── main.tsx                 # React entry point
│   ├── app/
│   │   ├── App.tsx              # Widget дэлгэц ба lifecycle
│   │   └── styles.css           # Нийт UI style
│   ├── features/
│   │   ├── battery/             # Батарейн дүрэм, тооцоо, DeviceIcon
│   │   ├── notifications/       # OverlayToast компонент
│   │   └── telemetry/           # Consent, event validation, analytics дүрэм
│   ├── platform/
│   │   └── desktopBridge.ts     # Tauri invoke / local HTTP сонголт
│   ├── shared/
│   │   ├── types.ts             # Runtime-уудын нийтлэг TypeScript төрөл
│   │   ├── defaults.ts          # Анхны тохиргоо ба demo өгөгдөл
│   │   └── i18n.ts              # Монгол/англи толь
│   └── server/
│       ├── main.ts             # Express/Vite entry point, API routes
│       ├── hardware/
│       │   ├── linuxProbe.ts    # Linux snapshot, provider merge
│       │   ├── linuxControls.ts # OS action ба capability шалгалт
│       │   ├── deviceGroups.ts # Баталгаажуулсан төхөөрөмжийн холболтуудыг нэгтгэх
│       │   └── providers/      # kairpods.ts, usbIdentity.ts, m220.ts
│       ├── http/listen.ts       # Loopback binding
│       └── persistence/         # Локал JSON state/telemetry хадгалалт
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Native entry point, tray, cache, commands
│   │   ├── hardware/
│   │   │   ├── mod.rs           # Native DTO, Windows/Linux probes, merge
│   │   │   ├── kairpods.rs      # Linux optional D-Bus provider
│   │   │   ├── usb_identity.rs  # USB interface танилт
│   │   │   ├── m220.rs          # M220 HID батарейн info query
│   │   │   └── device_groups.rs # Баталгаажуулсан холболтуудын нэгтгэл
│   │   ├── autostart.rs         # Login startup
│   │   └── linux_controls.rs    # Native OS action
│   ├── capabilities/           # Webview permissions
│   ├── icons/                  # App bundle icons
│   └── linux/                  # Linux packaging resources / udev rules
├── scripts/                    # Test discovery, build cleanup, Linux install
├── docs/                       # Ашиглалт, архитектур, огноотой нотолгоо
├── index.html                  # Vite HTML entry
├── vite.config.ts
├── tsconfig.json
├── package.json
└── package-lock.json
```

## Хамаарлын дүрэм

- `app` нь feature, shared, platform модулиудыг хэрэглэнэ. `server`-ийг browser UI-д import хийхгүй.
- `features/battery` нь OS command ажиллуулахгүй; өгөгдөл дээр ажиллах дүрэм, дүрслэл агуулна.
- `shared` нь React, Node filesystem, Tauri API-аас хамаарахгүй. Demo өгөгдөл нь бодит hardware уншилт биш.
- `platform/desktopBridge.ts` нь frontend ба runtime-ийн зааг. Browser API болон Tauri command нэрийг энд төвлөрүүлнэ.
- `server/hardware/providers` нь тусгай service/protocol уншигчдад зориулагдсан. Ерөнхий snapshot нэгтгэл `linuxProbe.ts`-д байна.
- `server/persistence` нь локал хадгалалт. Telemetry payload validation-ийг `features/telemetry`-ээс хэрэглэдэг.
- Rust provider-ууд `hardware/mod.rs`-ийн DTO гэрээг ашиглана. TS ба Rust runtime-ийн DTO талбаруудыг өөрчлөхдөө хоёуланг нь шинэчилнэ.

`@/` alias нь `src/`-ийг заана. Одоогийн relative import-ууд хүчинтэй хэвээр. Root config, Rust source эсвэл docs руу `@/` ашиглахгүй.

## Шинэ код хаана нэмэх вэ?

| Өөрчлөлт | Байрлуулах газар |
| --- | --- |
| Цэнэгийн босго/төлөвийн дүрэм | `src/features/battery/` |
| Widget-ийн layout | `src/app/App.tsx` |
| Notification UI | `src/features/notifications/` |
| Монгол/англи текст | `src/shared/i18n.ts` |
| Native command-ийн frontend wrapper | `src/platform/desktopBridge.ts` |
| Linux browser provider | `src/server/hardware/providers/` |
| Desktop hardware provider | `src-tauri/src/hardware/` |
| API route | `src/server/main.ts` — хэмжээ өсвөл HTTP route модулиар салгана |
| Хэрэглэгчийн заавар | `docs/` |
| Тухайн өдрийн scan/судалгааны нотолгоо | `docs/YYYY-MM-DD/` |

`OverlayToast` нь одоогийн compact widget-д холбогдоогүй компонент. Telemetry engine нь local store validation болон тестэд ашиглагддаг; бүх analytics UI идэвхтэй гэж үзэхгүй. Ашиглалтын байдал нь тодорхойгүй кодыг бүтцийн өөрчлөлтийн үеэр устгаагүй.

## Тест ба үүсдэг файлууд

Тестийг шалгаж буй модультай нь зэрэгцүүлэн `*.test.ts` нэрээр байрлуулна. `npm test` нь `src/` дотроос автоматаар олдог тул шинэ тест нэмэхэд package script засахгүй. Rust тестүүд модулийн `#[cfg(test)]` хэсэгт байна.

- `node_modules/`: npm dependency; гараар засахгүй.
- `dist/`: Vite build. `npm run clean` зөвхөн үүнийг цэвэрлэнэ.
- `src-tauri/target/`: native build болон installer. `clean` үүнийг устгахгүй.
- `src-tauri/gen/`: Tauri-ийн generated schema; гараар засахгүй.
- `.volttray/`: browser fallback-ийн хэрэглэгчийн локал өгөгдөл; source биш, зөөх/устгахгүй.

`npm run dev`, `npm start`, `npm run tauri:dev`, `npm run build` командууд өмнөхтэй адил хэрэглэгдэнэ. Root дахь хуучин `server.ts`-ийн оронд package scripts `src/server/main.ts`-ийг ажиллуулна. Vite HTML entry `src/main.tsx` хэвээр.

Огноотой хуучин тайлангийн замууд тухайн үеийн snapshot-ийг илэрхийлнэ. [Хуучин → шинэ замын хүснэгт](2026-11-15/structure-migration.md)-ээр одоогийн файлыг олно.
