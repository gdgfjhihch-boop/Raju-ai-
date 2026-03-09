const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("\n[RAJU AI] — Running Turbo-Shield v11.0 (New Arch + Hermes Fix)...");

const ROOT = process.cwd();
const APP_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const GRADLE_PROPS = path.join(ROOT, 'android', 'gradle.properties');

// 1. ENABLE New Architecture & Hermes (Required for Llama.rn & RN 0.76)
if (fs.existsSync(GRADLE_PROPS)) {
  let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
  props = props.replace(/newArchEnabled=false/g, "newArchEnabled=true");
  props = props.replace(/hermesEnabled=false/g, "hermesEnabled=true");

  if (!props.includes("GRADLE_SHIELD_V11")) {
    props += `\n# GRADLE_SHIELD_V11\nnewArchEnabled=true\nhermesEnabled=true\nandroid.ndkVersion=26.1.10909125\n`;
    fs.writeFileSync(GRADLE_PROPS, props);
  }
  console.log("✓ New Architecture & Hermes ENABLED (Llama.rn & White Screen fixed)");
}

// 2. Auto-Detect and Unlock Hermes Compiler (Fixes OS_FLAVOR / File Not Found Error)
let realHermescPath = "";
try {
    console.log("Searching for hermesc...");
    const findCmd = 'find ' + path.join(ROOT, 'node_modules') + ' -name "hermesc" -type f | grep -i "linux" | head -n 1';
    realHermescPath = execSync(findCmd).toString().trim();
    if (realHermescPath) {
        execSync(`chmod +x "${realHermescPath}"`);
        console.log(`✓ Found and unlocked hermesc at: ${realHermescPath}`);
        // Convert to relative path for build.gradle
        realHermescPath = path.relative(path.join(ROOT, 'android', 'app'), realHermescPath);
    }
} catch (e) {
    console.log("⚠️ Could not dynamically find hermesc. Let's hope RN handles it.");
}

// 3. Surgical Patch for Entry Point & Hermes Command
if (fs.existsSync(APP_GRADLE)) {
  let gradle = fs.readFileSync(APP_GRADLE, 'utf8');
  let lines = gradle.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    
    // Set exact Expo Entry
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

  // Inject dynamic hermes command if found
  if (realHermescPath && !gradle.includes('hermesCommand =')) {
      gradle = gradle.replace(/react\s*\{/, `react {\n        hermesCommand = "${realHermescPath}"`);
  }

  // Add Llama packaging options safely
  if (!gradle.includes("pickFirsts +=")) {
    const pkgBlock = `\n    packaging {\n        jniLibs {\n            useLegacyPackaging = true\n            pickFirsts += ['**/libc++_shared.so', '**/libllama.so', '**/librnllama.so']\n        }\n    }\n`;
    gradle = gradle.replace(/android\s*\{/, "android {" + pkgBlock);
  }

  // Set correct SDK version
  gradle = gradle.replace(/minSdkVersion\s+\d+/, "minSdkVersion 26").replace(/minSdk\s+\d+/, "minSdk 26");
  
  fs.writeFileSync(APP_GRADLE, gradle);
  console.log("✓ android/app/build.gradle Patched (TurboModules Ready)");
}

console.log("[RAJU AI] — Shield V11 Complete! GO FOR BUILD!\n");
        
