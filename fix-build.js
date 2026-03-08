const fs = require('fs');
const path = require('path');

console.log("\n[RAJU AI] — Running Ultimate Gradle Shield v5.0...");

const ROOT = process.cwd();
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');

// 1. Enable New Architecture in gradle.properties
if (fs.existsSync(GRADLE_PROPS)) {
  let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
  props = props.replace(/newArchEnabled=false/g, "newArchEnabled=true");
  if (!props.includes("GRADLE_SHIELD_V5")) {
    props += `\n# GRADLE_SHIELD_V5\nnewArchEnabled=true\nhermesEnabled=true\nandroid.ndkVersion=26.1.10909125\n`;
    fs.writeFileSync(GRADLE_PROPS, props);
  }
  console.log("✓ gradle.properties (NewArch: true) - OK");
}

// 2. Kill the path='' error permanently
if (fs.existsSync(APP_GRADLE)) {
  let gradle = fs.readFileSync(APP_GRADLE, 'utf8');

  // Replace the dynamic 'react { ... }' block with hardcoded safe paths
  const reactBlockRegex = /react\s*\{[\s\S]*?\}/;
  if (gradle.match(reactBlockRegex)) {
    const safeReactBlock = `react {
    entryFile = file("../../node_modules/expo/AppEntry.js")
    reactNativeDir = file("../../node_modules/react-native")
    codegenDir = file("../../node_modules/@react-native/codegen")
    cliFile = file("../../node_modules/@expo/cli/build/bin/cli")
    hermesCommand = "../../node_modules/react-native/sdks/hermesc/%OS_FLAVOR%/hermesc"
    bundleCommand = "export:embed"
}`;
    gradle = gradle.replace(reactBlockRegex, safeReactBlock);
    console.log("✓ Replaced dynamic Expo paths with HARDCODED paths (Goodbye path='')");
  }

  // Add packagingOptions for Llama C++
  if (!gradle.includes("pickFirsts +=")) {
    const pkgBlock = `\n    packaging {\n        jniLibs {\n            useLegacyPackaging = true\n            pickFirsts += ['**/libc++_shared.so', '**/libllama.so', '**/librnllama.so']\n        }\n    }\n`;
    gradle = gradle.replace(/android\s*\{/, "android {" + pkgBlock);
  }

  // Bump minSdk to 26
  gradle = gradle.replace(/minSdkVersion\s+\d+/, "minSdkVersion 26").replace(/minSdk\s+\d+/, "minSdk 26");

  fs.writeFileSync(APP_GRADLE, gradle);
  console.log("✓ android/app/build.gradle safely patched");
}

console.log("[RAJU AI] — Ultimate Shield V5 Complete!\n");
  
