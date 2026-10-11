#!/bin/bash
# Builds FunTrivia.app and FunTrivia.dmg into build/.
#   mac/build.sh            build app + DMG
#   mac/build.sh --no-dmg   build the app only
# Signing: uses $SIGN_IDENTITY if set, otherwise the first code-signing
# identity in your keychain, otherwise an ad-hoc signature (runs on this Mac).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAC="$ROOT/mac"
OUT="$ROOT/build"
APP="$OUT/FunTrivia.app"
DMG="$OUT/FunTrivia.dmg"
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$ROOT/package.json")"
MIN_MACOS="13.0"

echo "Building FunTrivia $VERSION"
rm -rf "$APP" "$DMG"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web"

# 1. Universal binary (Apple silicon + Intel)
for arch in arm64 x86_64; do
  swiftc -O -target "$arch-apple-macos$MIN_MACOS" -o "$OUT/FunTrivia-$arch" "$MAC/Sources/main.swift" \
    -framework AppKit -framework WebKit
done
lipo -create -output "$APP/Contents/MacOS/FunTrivia" "$OUT/FunTrivia-arm64" "$OUT/FunTrivia-x86_64"
rm "$OUT/FunTrivia-arm64" "$OUT/FunTrivia-x86_64"

# 2. The game itself: the same files the website serves
cp "$ROOT/index.html" "$APP/Contents/Resources/web/"
cp -R "$ROOT/src" "$ROOT/styles" "$ROOT/data" "$APP/Contents/Resources/web/"

# 3. Icon
ICONSET="$OUT/FunTrivia.iconset"
rm -rf "$ICONSET"
swift "$MAC/Tools/RenderIcon.swift" "$MAC/Icon.svg" "$ICONSET"
iconutil -c icns -o "$APP/Contents/Resources/FunTrivia.icns" "$ICONSET"
rm -rf "$ICONSET"

# 4. Info.plist
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>FunTrivia</string>
  <key>CFBundleDisplayName</key><string>FunTrivia</string>
  <key>CFBundleIdentifier</key><string>com.amalmehta.funtrivia</string>
  <key>CFBundleExecutable</key><string>FunTrivia</string>
  <key>CFBundleIconFile</key><string>FunTrivia</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>$MIN_MACOS</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.trivia-games</string>
  <key>NSHumanReadableCopyright</key><string>A trivia adventure across nine realms of knowledge.</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSPrincipalClass</key><string>NSApplication</string>
</dict>
</plist>
PLIST

# 5. Sign
IDENTITY="${SIGN_IDENTITY:-$(security find-identity -v -p codesigning 2>/dev/null | sed -n 's/^ *1) [0-9A-F]* "\(.*\)"$/\1/p')}"
IDENTITY="${IDENTITY:--}"
echo "Signing with: $IDENTITY"
codesign --force --deep --sign "$IDENTITY" "$APP"
codesign --verify --strict "$APP"

# 6. DMG with a drag-to-Applications shortcut
if [[ "${1:-}" != "--no-dmg" ]]; then
  STAGE="$OUT/dmg"
  rm -rf "$STAGE" && mkdir -p "$STAGE"
  cp -R "$APP" "$STAGE/"
  ln -s /Applications "$STAGE/Applications"
  hdiutil create -quiet -volname "FunTrivia" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
  rm -rf "$STAGE"
  codesign --force --sign "$IDENTITY" "$DMG"
  echo "Built $DMG"
fi
echo "Built $APP"
