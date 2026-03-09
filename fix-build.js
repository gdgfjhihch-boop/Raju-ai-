const fs = require('fs');
const path = require('path');

console.log("\n[RAJU AI] — Running Safe-Mode Shield v10.0...");

const ROOT = process.cwd();
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');

// 1. DISABLE New Architecture & Hermes (The Ultimate Safe Mode)
if (fs.existsSync(GRADLE_PROPS)) {
  let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
  
  // Sab kuch False kar do taaki screen load ho sake
  props = props.replace(/newArchEnabled=true/g, "newArchEnabled=false");
  props = props.replace(/newArchEnabled=undefined/g, "newArchEnabled=false");
  props = props.replace(/hermesEnabled=true/g, "hermesEnabled=false");

  if (!props.includes("GRADLE_SHIELD_V10")) {
    props += `\n# GRADLE_SHIELD_V10\nnewArchEnabled=false\nhermesEnabled=false\nandroid.ndkVersion=26.1.10909125\n`;
    fs.writeFileSync(GRADLE_PROPS, props);
  }
  console.log("✓ Forced Old Architecture & Disabled Hermes for Stability");
}

// 2. Surgical Patch for Entry Point (Expo Fixed)
if (fs.existsSync(APP_GRADLE)) {
  let gradle = fs.readFileSync(APP_GRADLE, 'utf8');
  let lines = gradle.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    
    // RAJU AI FIX: Point back to Expo's default entry file which we KNOW works!
    if (trimmed.startsWith('entryFile = ')) {
        lines[i] = '    entryFile = file("../../node_modules/expo/AppEntry.js")';
    } else if (trimmed.startsWith('reactNativeDir = ')) {
        lines[i] = '    reactNativeDir = file("../../node_modules/react-native")';
    } else if (trimmed.startsWith('codegenDir = ')) {
        lines[i] = '    codegenDir = file("../../node_modules/@react-native/codegen")';
    } else if (trimmed.startsWith('cliFile = ')) {
        lines[i] = '    cliFile = file("../../node_modules/@expo/cli/build/bin/cli")';
    }
  }
  gradle = lines.join('\n');

  // Fix SDK Versions
  gradle = gradle.replace(/minSdkVersion\s+\d+/, "minSdkVersion 26").replace(/minSdk\s+\d+/, "minSdk 26");
  
  fs.writeFileSync(APP_GRADLE, gradle);
  console.log("✓ android/app/build.gradle Patched (Expo Entry Restored)");
}

console.log("[RAJU AI] — Shield V10 Complete! GO FOR BUILD!\n");
