#!/usr/bin/env bash
set -euo pipefail

echo "=== VoltTray Linux Setup (udev + Auto-start) ==="

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RULES_SRC="$ROOT_DIR/src-tauri/linux/99-volttray-peripherals.rules"
RULES_DST="/etc/udev/rules.d/99-volttray-peripherals.rules"

if [ -f "$RULES_SRC" ]; then
  echo "Installing udev rules to $RULES_DST (requires sudo)..."
  sudo cp "$RULES_SRC" "$RULES_DST"
  sudo udevadm control --reload-rules
  sudo udevadm trigger --subsystem-match=hidraw
  echo "[OK] udev rules installed."
fi

# Install the separate, interface-scoped M220 battery query permission.
bash "$ROOT_DIR/scripts/install-m220-access.sh"

# Configure XDG Desktop Autostart so VoltTray runs automatically in tray on login
AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
mkdir -p "$AUTOSTART_DIR"
BIN_PATH="$(command -v volttray || true)"
if [ -z "$BIN_PATH" ] && [ -x "$ROOT_DIR/src-tauri/target/release/volttray" ]; then
  BIN_PATH="$ROOT_DIR/src-tauri/target/release/volttray"
fi

if [ -n "$BIN_PATH" ]; then
  cat > "$AUTOSTART_DIR/volttray.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=VoltTray
Comment=Local Battery & Charger Monitor
Exec="$BIN_PATH" --minimized
Terminal=false
X-GNOME-Autostart-enabled=true
Categories=Utility;System;
EOF
  echo "[OK] Auto-start entry written to $AUTOSTART_DIR/volttray.desktop"
else
  echo "[INFO] VoltTray binary not built yet. Run 'npm run tauri:build' first, or VoltTray will register autostart automatically on first launch."
fi

echo ""
echo "Optional Linux battery backend check:"
for cmd in upower notify-send; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  [OK] $cmd"
  else
    echo "  [--] $cmd"
  fi
done
