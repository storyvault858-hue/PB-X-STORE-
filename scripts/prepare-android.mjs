import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const appDir = path.join(androidDir, 'app');
const resDir = path.join(appDir, 'src', 'main', 'res');

if (!fs.existsSync(androidDir)) {
  console.error('Android project folder not found. Run "npx cap add android" first.');
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// ---------------------------------------------------------------------------
// Minimal Zero-Dependency PNG Encoder for Legacy Android Mipmap Launcher Icons
// Renders the exact Glossy Black Metallic 3D "PB" Logo so EVERY Android launcher
// and APK installer preview shows the black PB logo (never Capacitor default).
// ---------------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodeRgbaPng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter type: None
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Signed distance to a bold geometric "P" and "B" in normalized [0..1] icon coordinates
function sdRoundedBox(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - hw + r;
  const dy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

function isInsidePB(u, v) {
  // Bold geometric "P" centered left (x: 0.255..0.485, y: 0.345..0.655)
  const pStem = u >= 0.265 && u <= 0.332 && v >= 0.35 && v <= 0.65;
  const pOuter = sdRoundedBox(u, v, 0.378, 0.435, 0.108, 0.085, 0.072) <= 0 && u >= 0.265;
  const pHole = sdRoundedBox(u, v, 0.376, 0.435, 0.052, 0.036, 0.028) <= 0 && u >= 0.332;
  const inP = pStem || (pOuter && !pHole);

  // Bold geometric "B" centered right (x: 0.525..0.745, y: 0.345..0.655)
  const bStem = u >= 0.525 && u <= 0.592 && v >= 0.35 && v <= 0.65;
  const bTopOuter = sdRoundedBox(u, v, 0.630, 0.428, 0.105, 0.078, 0.064) <= 0 && u >= 0.525;
  const bTopHole = sdRoundedBox(u, v, 0.625, 0.428, 0.048, 0.030, 0.022) <= 0 && u >= 0.592;
  const bBotOuter = sdRoundedBox(u, v, 0.636, 0.568, 0.112, 0.082, 0.068) <= 0 && u >= 0.525;
  const bBotHole = sdRoundedBox(u, v, 0.630, 0.568, 0.053, 0.033, 0.025) <= 0 && u >= 0.592;
  const inB = bStem || (bTopOuter && !bTopHole) || (bBotOuter && !bBotHole);

  return inP || inB;
}

function renderBlackPBIconPng(size, shape = 'squircle') {
  const rgba = Buffer.alloc(size * size * 4);
  const sub = 3; // 3x3 supersampling for razor-sharp antialiased edges

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;

      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const u = (x + (sx + 0.5) / sub) / size;
          const v = (y + (sy + 0.5) / sub) / size;

          let insideShape = true;
          let distEdge = 1;

          if (shape === 'round') {
            const d = Math.hypot(u - 0.5, v - 0.5) - 0.47;
            insideShape = d <= 0;
            distEdge = -d;
          } else if (shape === 'squircle') {
            const d = sdRoundedBox(u, v, 0.5, 0.5, 0.46, 0.46, 0.145);
            insideShape = d <= 0;
            distEdge = -d;
          }

          if (!insideShape) continue;

          // Deep glossy obsidian-charcoal metallic gradient matching user's black PB emblem
          const t = Math.max(0, Math.min(1, v));
          let base = 58 * (1 - t) * (1 - t) + 26 * (1 - t) + 12 * t;

          // Subtle top glass sheen highlight (upper 45% dome)
          if (v < 0.46) {
            const sheen = Math.pow(1 - v / 0.46, 1.8) * 34;
            base += sheen;
          }

          // Top bright specular rim & subtle dark bottom lip
          if (distEdge < 0.032) {
            const rimFactor = 1 - distEdge / 0.032;
            if (v < 0.45) {
              base += rimFactor * (1 - v / 0.45) * 48;
            } else {
              base -= rimFactor * 14;
            }
          }

          let cr = Math.max(8, Math.min(255, base));
          let cg = Math.max(8, Math.min(255, base));
          let cb = Math.max(10, Math.min(255, base + 3));

          if (isInsidePB(u, v)) {
            cr = 255;
            cg = 255;
            cb = 255;
          }

          rSum += cr;
          gSum += cg;
          bSum += cb;
          aSum += 255;
        }
      }

      const samples = sub * sub;
      const idx = (y * size + x) * 4;
      if (aSum > 0) {
        rgba[idx] = Math.round(rSum / (aSum / 255));
        rgba[idx + 1] = Math.round(gSum / (aSum / 255));
        rgba[idx + 2] = Math.round(bSum / (aSum / 255));
        rgba[idx + 3] = Math.round(aSum / samples);
      }
    }
  }

  return encodeRgbaPng(size, size, rgba);
}

// 1. Configure AndroidManifest.xml (permissions + cleartext traffic)
const manifestPath = path.join(appDir, 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  if (!manifest.includes('android.permission.INTERNET')) {
    manifest = manifest.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>'
    );
  }

  if (!manifest.includes('android.permission.ACCESS_NETWORK_STATE')) {
    manifest = manifest.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n</manifest>'
    );
  }

  if (!manifest.includes('android:usesCleartextTraffic')) {
    manifest = manifest.replace(
      '<application',
      '<application\n        android:usesCleartextTraffic="true"'
    );
  }

  // Prevent Android from panning or violently shrinking the WebView when the keyboard opens
  if (manifest.includes('android:windowSoftInputMode=')) {
    manifest = manifest.replace(
      /android:windowSoftInputMode="[^"]*"/g,
      'android:windowSoftInputMode="adjustNothing"'
    );
  } else {
    manifest = manifest.replace(
      '<activity',
      '<activity\n            android:windowSoftInputMode="adjustNothing"'
    );
  }

  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('Updated AndroidManifest.xml (cleartext + adjustNothing)');
}

// 2. Configure versionCode & versionName in android/app/build.gradle
const buildGradlePath = path.join(appDir, 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const runNumber = Math.max(1, Number.parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10) || 1);
  let gradle = fs.readFileSync(buildGradlePath, 'utf8');

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${runNumber}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "1.0.${runNumber}"`);

  fs.writeFileSync(buildGradlePath, gradle, 'utf8');
  console.log(`Updated build.gradle -> versionCode=${runNumber}, versionName=1.0.${runNumber}`);
}

// 3. Configure clean Titanium Light launch colors & styles + fix Android 15/16 status/nav bar overlap
const valuesDir = path.join(resDir, 'values');
const valuesV35Dir = path.join(resDir, 'values-v35');
ensureDir(valuesDir);
ensureDir(valuesV35Dir);

const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#27272A</color>
    <color name="colorPrimaryDark">#ECEEF2</color>
    <color name="colorAccent">#52525B</color>
    <color name="pbx_canvas_light">#ECEEF2</color>
</resources>
`;
fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml, 'utf8');

const icLauncherBgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#141417</color>
</resources>
`;
fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), icLauncherBgColorXml, 'utf8');

const stylesPath = path.join(valuesDir, 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, 'utf8');
  if (!styles.includes('android:windowBackground')) {
    styles = styles.replace(
      '<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">',
      `<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@color/pbx_canvas_light</item>
        <item name="android:statusBarColor">@color/pbx_canvas_light</item>
        <item name="android:navigationBarColor">@color/pbx_canvas_light</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowLightNavigationBar">true</item>
        <item name="android:fitsSystemWindows">true</item>`
    );
  }
  styles = styles.replace(
    '<item name="android:background">@drawable/splash</item>',
    '<item name="android:background">@color/pbx_canvas_light</item>'
  );
  fs.writeFileSync(stylesPath, styles, 'utf8');
  console.log('Updated styles.xml with Titanium Light launch background & system bar insets');
}

// Opt out of Android 15 forced edge-to-edge overlap & keep light status/nav bar icons
const stylesV35Xml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@color/pbx_canvas_light</item>
        <item name="android:statusBarColor">@color/pbx_canvas_light</item>
        <item name="android:navigationBarColor">@color/pbx_canvas_light</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowLightNavigationBar">true</item>
        <item name="android:fitsSystemWindows">true</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@color/pbx_canvas_light</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
    </style>
</resources>
`;
fs.writeFileSync(path.join(valuesV35Dir, 'styles.xml'), stylesV35Xml, 'utf8');

// 3b. Patch MainActivity.java with AndroidX WindowInsetsCompat listener
// Guarantees status bar, display cutout, 3-button/gesture nav bar, and IME keyboard
// NEVER overlap header or trap bottom content on Android 10 through Android 16 (API 36).
function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java') {
      return full;
    }
  }
  return null;
}

const javaSrcDir = path.join(appDir, 'src', 'main', 'java');
const mainActivityPath = findMainActivity(javaSrcDir);
if (mainActivityPath) {
  const existingJava = fs.readFileSync(mainActivityPath, 'utf8');
  const pkgMatch = existingJava.match(/^\s*package\s+([^;]+);/m);
  const pkgLine = pkgMatch ? `package ${pkgMatch[1].trim()};` : 'package com.pbxstore.admin;';

  const patchedMainActivity = `${pkgLine}

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                // Pad ONLY system status bar & navigation bar (never shrink on IME keyboard)
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(rootView);
        }
    }
}
`;
  fs.writeFileSync(mainActivityPath, patchedMainActivity, 'utf8');
  console.log(`Patched ${path.relative(rootDir, mainActivityPath)} with WindowInsetsCompat system-bar padding.`);
}

// 4. Write exact Glossy Black Metallic 3D "PB" Adaptive Launcher Icon (API 26+ Vector)
const drawableDir = path.join(resDir, 'drawable');
const mipmapV26Dir = path.join(resDir, 'mipmap-anydpi-v26');
ensureDir(drawableDir);
ensureDir(mipmapV26Dir);

const iconBgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Glossy obsidian-charcoal vertical metallic gradient -->
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="54"
                android:startY="6"
                android:endX="54"
                android:endY="102"
                android:type="linear">
                <item android:offset="0" android:color="#4B4B52" />
                <item android:offset="0.22" android:color="#2E2E33" />
                <item android:offset="0.68" android:color="#18181B" />
                <item android:offset="1" android:color="#09090B" />
            </gradient>
        </aapt:attr>
    </path>
    <!-- Soft glass specular top dome reflection -->
    <path android:pathData="M0,0h108v52C82,60 26,60 0,52z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="54"
                android:startY="0"
                android:endX="54"
                android:endY="56"
                android:type="linear">
                <item android:offset="0" android:color="#40FFFFFF" />
                <item android:offset="1" android:color="#00FFFFFF" />
            </gradient>
        </aapt:attr>
    </path>
</vector>
`;

const iconFgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Subtle inner 3D glass rim highlight inside adaptive safe zone -->
    <path
        android:pathData="M34,20 L74,20 C82,20 88,26 88,34 L88,74 C88,82 82,88 74,88 L34,88 C26,88 20,82 20,74 L20,34 C20,26 26,20 34,20 Z"
        android:strokeWidth="1.5"
        android:strokeColor="#28FFFFFF"
        android:fillColor="#00000000" />
    <!-- Bold Pure White Letter P (centered in adaptive safe zone) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M31.5,39 L44.5,39 C50.2,39 53.7,42.3 53.7,47.6 C53.7,52.9 50.2,56.2 44.5,56.2 L38.2,56.2 L38.2,69 L31.5,69 Z M38.2,44.4 L38.2,50.8 L43.8,50.8 C46.1,50.8 47.4,49.6 47.4,47.6 C47.4,45.6 46.1,44.4 43.8,44.4 Z" />
    <!-- Bold Pure White Letter B (centered in adaptive safe zone) -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M56.8,39 L69.2,39 C74.5,39 77.6,41.7 77.6,46.2 C77.6,49.2 75.9,51.4 73.1,52.4 C76.6,53.4 78.7,56.1 78.7,59.9 C78.7,65.2 75.0,69 69.1,69 L56.8,69 Z M63.4,44.2 L63.4,50.2 L68.3,50.2 C70.4,50.2 71.6,49.1 71.6,47.2 C71.6,45.3 70.4,44.2 68.3,44.2 Z M63.4,55.3 L63.4,63.7 L68.8,63.7 C71.2,63.7 72.5,62.4 72.5,59.5 C72.5,56.6 71.2,55.3 68.8,55.3 Z" />
</vector>
`;

const adaptiveLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;

const drawableV24Foreground = path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml');
if (fs.existsSync(drawableV24Foreground)) {
  fs.rmSync(drawableV24Foreground, { force: true });
}

fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), iconBgXml, 'utf8');
fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), iconFgXml, 'utf8');
fs.writeFileSync(path.join(mipmapV26Dir, 'ic_launcher.xml'), adaptiveLauncherXml, 'utf8');
fs.writeFileSync(path.join(mipmapV26Dir, 'ic_launcher_round.xml'), adaptiveLauncherXml, 'utf8');

// 5. Overwrite ALL legacy mipmap PNG icons so every launcher & APK installer shows the black PB logo
const mipmapDensities = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

for (const { folder, size } of mipmapDensities) {
  const targetDir = path.join(resDir, folder);
  ensureDir(targetDir);
  const squirclePng = renderBlackPBIconPng(size, 'squircle');
  const roundPng = renderBlackPBIconPng(size, 'round');
  fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), squirclePng);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), roundPng);
  // Remove Capacitor's old foreground PNG if present so nothing overrides our black PB vector
  const legacyFg = path.join(targetDir, 'ic_launcher_foreground.png');
  if (fs.existsSync(legacyFg)) {
    fs.rmSync(legacyFg, { force: true });
  }
}

console.log('Configured glossy black PB main launcher icon (vector + all mipmap PNGs) & Android 15 inset fix.');
