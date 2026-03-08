const fs = require('fs');
const path = require('path');

console.log("\n[RAJU AI] — Running Minimal Gradle Shield v4.0...");

const ROOT = process.cwd();
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');

// 1. Enable New Architecture in gradle.properties
if (fs.existsSync(GRADLE_PROPS)) {
  let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
  props = props.replace(/newArchEnabled=false/g, "newArchEnabled=true");
  if (!props.includes("GRADLE_SHIELD_V4")) {
    props += `\n# GRADLE_SHIELD_V4\nnewArchEnabled=true\nhermesEnabled=true\nandroid.ndkVersion=26.1.10909125\n`;
    fs.writeFileSync(GRADLE_PROPS, props);
    console.log("✓ gradle.properties (NewArch: true) - OK");
  }
}

// 2. Safe patches for android/app/build.gradle
if (fs.existsSync(APP_GRADLE)) {
  let gradle = fs.readFileSync(APP_GRADLE, 'utf8');
  let changed = false;

  // Add packagingOptions for Llama to prevent .so C++ conflicts
  if (!gradle.includes("pickFirsts +=")) {
    const pkgBlock = `\n    packaging {\n        jniLibs {\n            useLegacyPackaging = true\n            pickFirsts += ['**/libc++_shared.so', '**/libllama.so', '**/librnllama.so']\n        }\n    }\n`;
    gradle = gradle.replace(/android\s*\{/, "android {" + pkgBlock);
    changed = true;
    console.log("✓ Added packagingOptions for Llama C++");
  }

  // Ensure minSdk is at least 26 for Llama GGUF
  if (!gradle.includes("minSdk 26") && !gradle.includes("minSdkVersion 26")) {
     gradle = gradle.replace(/minSdkVersion\s+\d+/, "minSdkVersion 26").replace(/minSdk\s+\d+/, "minSdk 26");
     changed = true;
     console.log("✓ Bumped minSdk to 26");
  }

  if (changed) fs.writeFileSync(APP_GRADLE, gradle);
}

console.log("[RAJU AI] — Shield V4 Complete!\n");
