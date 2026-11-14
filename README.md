# VoltTray

VoltTray нь Windows болон Linux дээр system tray-д ажиллаж, компьютер болон холбогдсон төхөөрөмжүүдийн батарейн түвшин, цэнэглэгчийн төлөвийг харуулдаг desktop апп юм. Hardware мэдээлэл, тохиргоо болон зөвшөөрсөн telemetry локал төхөөрөмж дээр хадгалагдана. Gemini API key шаардлагагүй.

## Desktop апп ажиллуулах

Шаардлагатай орчин: Node.js `20.19+` эсвэл `22.12+`, npm, Rust stable toolchain, мөн таны үйлдлийн системд шаардлагатай Tauri build сангууд. Linux сангуудын жагсаалт [desktop build зааварт](docs/desktop-build.md) бий.

```bash
npm ci
npm run tauri:dev
```

Release installer үүсгэх:

```bash
npm run tauri:build
```

Build гаралтууд `src-tauri/target/release/bundle/` дотор хадгалагдана. Цонхыг хаахад апп system tray-д үлдэнэ. Аппыг бүрэн хаахдаа tray цэснээс **Quit** сонгоно.

## Browser хувилбар

Linux дээр kAirPods service ажиллаж байвал AirPods-ийн зүүн, баруун, кейсний цэнэгийг тусад нь харуулна. [Тохиргоо ба шалгах заавар](docs/airpods.md).

Tauri-гүйгээр UI-г хөгжүүлэхэд:

```bash
npm run dev
```

Локал сервер `127.0.0.1:3000` дээр ажиллана. Үүнийг бусад төхөөрөмжид нээлттэй server гэж ашиглахгүй.

## Шалгалтууд

```bash
npm test
npm run lint
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --locked --offline
```

## Төслийн бүтэц

Файлуудын үүрэг, хамаарал, шинэ код хаана нэмэхийг [архитектурын заавар](docs/architecture.md)-аас харна уу. Ашиглалт болон судалгааны тайлангууд [docs index](docs/README.md)-д бий.
