const fs = require('fs');
const path = require('path');

console.log("\n[RAJU AI] — Running Bulletproof Gradle Shield v7.0...");

const ROOT = process.cwd();
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');

// 1. Enable New Architecture in gradle.properties
if (fs.existsSync(GRADLE_PROPS)) {
  let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
  props = props.replace(/newArchEnabled=false/g, "newArchEnabled=true");
  if (!props.includes("GRADLE_SHIELD_V7")) {
    props += `\n# GRADLE_SHIELD_V7\nnewArchEnabled=true\nhermesEnabled=true\nandroid.ndkVersion=26.1.10909125\n`;
    fs.writeFileSync(GRADLE_PROPS, props);
  }
  console.log("✓ gradle.properties (NewArch: true) - OK");
}

// 2. Safely replace dynamic paths line-by-line
if (fs.existsSync(APP_GRADLE)) {
  let gradle = fs.readFileSync(APP_GRADLE, 'utf8');

  let lines = gradle.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    
    if (trimmed.startsWith('entryFile = ')) {
        lines[i] = '    entryFile = file("../../node_modules/expo/AppEntry.js")';
    } else if (trimmed.startsWith('reactNativeDir = ')) {
        lines[i] = '    reactNativeDir = file("../../node_modules/react-native")';
    } else if (trimmed.startsWith('codegenDir = ')) {
        lines[i] = '    codegenDir = file("../../node_modules/@react-native/codegen")';
    } else if (trimmed.startsWith('cliFile = ')) {
        lines[i] = '    cliFile = file("../../node_modules/@expo/cli/build/bin/cli")';
    } else if (trimmed.startsWith('hermesCommand = ')) {
        // RAJU AI FIX: Explicitly point to Linux hermes compiler for GitHub Actions
        lines[i] = '    hermesCommand = "../../node_modules/react-native/sdks/hermesc/linux64-bin/hermesc"';
    }
  }
  gradle = lines.join('\n');

  // Add packagingOptions for Llama C++
  if (!gradle.includes("pickFirsts +=")) {
    const pkgBlock = `\n    packaging {\n        jniLibs {\n            useLegacyPackaging = true\n            pickFirsts += ['**/libc++_shared.so', '**/libllama.so', '**/librnllama.so']\n        }\n    }\n`;
    gradle = gradle.replace(/android\s*\{/, "android {" + pkgBlock);
  }

  // Bump minSdk to 26 for Llama.rn
  gradle = gradle.replace(/minSdkVersion\s+\d+/, "minSdkVersion 26").replace(/minSdk\s+\d+/, "minSdk 26");

  fs.writeFileSync(APP_GRADLE, gradle);
  console.log("✓ android/app/build.gradle safely patched (Hermes Linux fixed)");
}

console.log("[RAJU AI] — Bulletproof Shield V7 Complete!\n");
