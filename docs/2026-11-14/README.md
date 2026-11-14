# VoltTray scan — 2026-11-14

Strict mode-оор React/Vite web fallback, Tauri desktop код, package manifests, Linux install script болон төслийн баримт бичгийг шалгав. `node_modules/`, `dist/`, `src-tauri/target/` зэрэг үүсмэл хавтсуудыг эх кодын скангаас хассан.

Дэлгэрэнгүй, Монгол хэл дээрх тайлан: [reports/strict/report.md](reports/strict/report.md). Машин унших хувилбар: [reports/strict/report.json](reports/strict/report.json).

Ажиллах шалгалтууд: `npm ci --offline`, `npm run lint`, `npm test`, `npm run build`, Rust test болон Linux `.deb` build. AppImage гаргах үед AppImage runtime-г GitHub-аас татах алхам сүлжээний хязгаарлалтад бүдэрсэн. Хавтас доторх `audit/`, `dependencies/`, `frontend/`, `backend/`, `database/`, `scripts/` замууд нь тухайн өдрийн companion материалд зориулсан.

Энэ workspace-ийн `.git/` хавтас хоосон тул branch болон өмнөх tracked diff-ийг тогтоох боломжгүй байв.
