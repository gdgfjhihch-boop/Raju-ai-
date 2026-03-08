const fs = require('fs');
const path = require('path');

console.log("\n[RAJU AI] — Running Gradle Shield...");

const ROOT = process.cwd();
const ANDROID_APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');
const SAFE_ROOT = ROOT.replace(/\\/g, "/");
const SAFE_NM = path.join(ROOT, "node_modules").replace(/\\/g, "/");

// 1. Fix the `path=''` empty string error
if (fs.existsSync(ANDROID_APP_GRADLE)) {
  let appGradle = fs.readFileSync(ANDROID_APP_GRADLE, 'utf8');
  if (!appGradle.includes("project.ext.react")) {
    const fixBlock = `
project.ext.react = [
    root: "${SAFE_ROOT}",
    reactNativeDir: "${SAFE_NM}/react-native",
    bundleAssetName: "index.android.bundle"
]
`;
    appGradle = fixBlock + "\n" + appGradle;
    fs.writeFileSync(ANDROID_APP_GRADLE, appGradle);
    console.log("[RAJU AI] — android/app/build.gradle path fixed ✓");
  }
}

// 2. Enable New Architecture and set NDK
if (fs.existsSync(GRADLE_PROPS)) {
  let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
  
  if (props.includes("newArchEnabled=false")) {
    props = props.replace(/newArchEnabled=false/g, "newArchEnabled=true");
  }

  if (!props.includes("GRADLE_SHIELD_APPLIED")) {
    props += `\n# GRADLE_SHIELD_APPLIED\nnewArchEnabled=true\nhermesEnabled=true\nandroid.ndkVersion=26.1.10909125\n`;
    fs.writeFileSync(GRADLE_PROPS, props);
    console.log("[RAJU AI] — gradle.properties shielded (NewArch: true) ✓");
  } else {
    fs.writeFileSync(GRADLE_PROPS, props);
    console.log("[RAJU AI] — gradle.properties already active ✓");
  }
}

console.log("[RAJU AI] — Gradle Shield Complete!\n");
