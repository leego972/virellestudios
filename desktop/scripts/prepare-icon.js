// Desktop installer build — icon preparation.
//
// electron-builder's mac/win/linux configs reference `build/icon.png`. The
// repo doesn't commit a duplicate of the brand icon (we never duplicate
// branding assets — `client/public/virelle-favicon-512.png` is the single
// source of truth). This script copies the canonical favicon into the
// expected `desktop/build/icon.png` slot just before electron-builder runs,
// so the produced .dmg / .exe / .AppImage all carry the brand mark.
//
// If the source favicon is missing, the build still succeeds — electron-
// builder falls back to the default Electron icon and prints a warning.

const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "..", "..", "client", "public", "virelle-favicon-512.png");
const DEST_DIR = path.resolve(__dirname, "..", "build");
const DEST = path.join(DEST_DIR, "icon.png");

if (!fs.existsSync(SRC)) {
  console.warn(`[prepare-icon] Source favicon not found at ${SRC}; electron-builder will use the default Electron icon.`);
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
fs.copyFileSync(SRC, DEST);
console.log(`[prepare-icon] Copied brand favicon → ${DEST}`);
