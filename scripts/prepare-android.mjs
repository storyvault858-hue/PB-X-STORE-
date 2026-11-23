import fs from 'node:fs';
import path from 'node:path';

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

  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('Updated AndroidManifest.xml');
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

// 3. Configure clean branded launch colors & styles (prevents white splash flash)
const valuesDir = path.join(resDir, 'values');
ensureDir(valuesDir);

const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#2563EB</color>
    <color name="colorPrimaryDark">#081020</color>
    <color name="colorAccent">#0EA5E9</color>
    <color name="pbx_canvas_dark">#081020</color>
</resources>
`;
fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml, 'utf8');

const icLauncherBgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1D4ED8</color>
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
        <item name="android:windowBackground">@color/pbx_canvas_dark</item>
        <item name="android:statusBarColor">@color/pbx_canvas_dark</item>
        <item name="android:navigationBarColor">@color/pbx_canvas_dark</item>`
    );
  }
  styles = styles.replace(
    '<item name="android:background">@drawable/splash</item>',
    '<item name="android:background">@color/pbx_canvas_dark</item>'
  );
  fs.writeFileSync(stylesPath, styles, 'utf8');
  console.log('Updated styles.xml with dark launch background');
}

// 4. Write crisp branded "PB" adaptive Android launcher icon (API 26+ vector)
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
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="12"
                android:startY="10"
                android:endX="96"
                android:endY="98"
                android:type="linear">
                <item android:offset="0" android:color="#2563EB" />
                <item android:offset="0.55" android:color="#1D4ED8" />
                <item android:offset="1" android:color="#081020" />
            </gradient>
        </aapt:attr>
    </path>
    <path
        android:pathData="M54,14 A40,40 0 1,1 53.99,14 Z"
        android:fillColor="#18FFFFFF" />
</vector>
`;

const iconFgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Letter P -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M29,34 L44,34 C50.5,34 54.5,37.8 54.5,43.8 C54.5,49.8 50.5,53.6 44,53.6 L36.5,53.6 L36.5,72 L29,72 Z M36.5,40.4 L36.5,47.2 L43.2,47.2 C45.8,47.2 47.2,45.9 47.2,43.8 C47.2,41.7 45.8,40.4 43.2,40.4 Z" />
    <!-- Letter B -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M58,34 L72.5,34 C78.5,34 82,37.1 82,42.2 C82,45.6 80.1,48.1 76.9,49.2 C80.8,50.3 83.2,53.3 83.2,57.4 C83.2,63.2 79,66.6 72.4,66.6 L58,66.6 Z M65.4,40.1 L65.4,46.7 L71.4,46.7 C73.8,46.7 75.1,45.5 75.1,43.4 C75.1,41.3 73.8,40.1 71.4,40.1 Z M65.4,52.5 L65.4,60.4 L71.9,60.4 C74.6,60.4 76.1,59.1 76.1,56.5 C76.1,53.9 74.6,52.5 71.9,52.5 Z" />
    <!-- Subtle Cyan Accent Pill under PB -->
    <path
        android:fillColor="#38BDF8"
        android:pathData="M58,70 L82,70 C83.1,70 84,70.9 84,72 C84,73.1 83.1,74 82,74 L58,74 C56.9,74 56,73.1 56,72 C56,70.9 56.9,70 58,70 Z" />
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

console.log('Configured PB X Store Admin adaptive launcher icons & Android build settings.');
