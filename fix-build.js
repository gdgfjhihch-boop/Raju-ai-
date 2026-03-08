const fs = require('fs');
const path = require('path');

console.log("\n[RAJU AI] — Running Gradle Shield...");

const ANDROID_DIR = path.join(__dirname, 'android');
const GRADLE_PROPS = path.join(ANDROID_DIR, 'gradle.properties');

if (fs.existsSync(ANDROID_DIR)) {
  if (fs.existsSync(GRADLE_PROPS)) {
    let props = fs.readFileSync(GRADLE_PROPS, 'utf8');
    
    // Force New Architecture to TRUE
    if (props.includes("newArchEnabled=false")) {
      props = props.replace(/newArchEnabled=false/g, "newArchEnabled=true");
    }

    // Apply Shield Settings
    if (!props.includes("GRADLE_SHIELD_APPLIED")) {
      props += `\n# GRADLE_SHIELD_APPLIED\nnewArchEnabled=true\nhermesEnabled=true\nandroid.ndkVersion=26.1.10909125\n`;
      fs.writeFileSync(GRADLE_PROPS, props);
      console.log("[RAJU AI] — gradle.properties patched (NewArch: true) ✓");
    } else {
      fs.writeFileSync(GRADLE_PROPS, props);
      console.log("[RAJU AI] — gradle.properties already shielded ✓");
    }
  }
} else {
  console.log("[RAJU AI] — 'android' folder not found yet. Skipping Gradle Shield.");
}
console.log("");
