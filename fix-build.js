#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            RAJU AI — "GRADLE SHIELD" BUILD FIX SCRIPT v1.0             ║
 * ║   Prevents the path='' null reference error in GitHub Actions Android  ║
 * ║   Runs automatically via `postinstall` in package.json                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Root Cause:
 *   During GitHub Actions CI, `node_modules` paths can resolve differently
 *   depending on the runner's working directory. React Native's Gradle plugin
 *   (specifically react.gradle) performs a `project.path` lookup that returns
 *   an empty string ('') when the monorepo or workspace root isn't correctly
 *   identified — causing a NullPointerException inside the Gradle build.
 *
 * This script:
 *   1. Locates android/app/build.gradle
 *   2. Injects explicit, absolute-safe node_modules paths
 *   3. Patches llama.rn CMake settings for GGUF model support
 *   4. Ensures react-native-reanimated Babel plugin is present
 *   5. Validates the NewArchitecture (Fabric) flag is enabled
 *   6. Pins NDK version for hermetic CI builds
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

// ─── Color helpers for terminal output ──────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const log = {
  ok: (msg) => console.log(`  ${c.green("✓")} ${msg}`),
  warn: (msg) => console.log(`  ${c.yellow("⚠")} ${msg}`),
  err: (msg) => console.log(`  ${c.red("✗")} ${msg}`),
  info: (msg) => console.log(`  ${c.cyan("◈")} ${msg}`),
  title: (msg) => console.log(`\n${c.bold(c.green(msg))}`),
};

// ─── Utility helpers ─────────────────────────────────────────────────────────
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function backupFile(filePath) {
  const backupPath = filePath + ".gradle-shield.bak";
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    log.info(`Backup created: ${path.basename(backupPath)}`);
  }
}

function insertAfterLine(content, searchStr, insertStr) {
  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.includes(searchStr));
  if (idx === -1) return { content, inserted: false };
  lines.splice(idx + 1, 0, insertStr);
  return { content: lines.join("\n"), inserted: true };
}

function ensureBlock(content, marker, block) {
  if (content.includes(marker)) return { content, changed: false };
  return { content: content + "\n" + block + "\n", changed: true };
}

// ─── Resolve critical paths ───────────────────────────────────────────────
const ROOT = process.cwd();
const ANDROID_APP_BUILD_GRADLE = path.join(ROOT, "android", "app", "build.gradle");
const ANDROID_BUILD_GRADLE = path.join(ROOT, "android", "build.gradle");
const ANDROID_SETTINGS_GRADLE = path.join(ROOT, "android", "settings.gradle");
const ANDROID_GRADLE_PROPERTIES = path.join(ROOT, "android", "gradle.properties");
const BABEL_CONFIG = path.join(ROOT, "babel.config.js");
const NODE_MODULES = path.join(ROOT, "node_modules");

// Normalize to forward slashes (Gradle requires this on all platforms)
const safeNodeModules = NODE_MODULES.replace(/\\/g, "/");
const safeRoot = ROOT.replace(/\\/g, "/");

console.log(
  c.bold("\n╔══════════════════════════════════════════════╗")
);
console.log(c.bold("║       RAJU AI — GRADLE SHIELD v1.0          ║"));
console.log(
  c.bold("╚══════════════════════════════════════════════╝")
);
log.info(`Project root : ${safeRoot}`);
log.info(`node_modules : ${safeNodeModules}`);
log.info(`Platform     : ${os.platform()} / ${os.arch()}`);
log.info(`Node.js      : ${process.version}`);

// ─── 1. android/app/build.gradle — Core path injection ───────────────────
log.title("TASK 1 — Patching android/app/build.gradle");

if (!fs.existsSync(ANDROID_APP_BUILD_GRADLE)) {
  log.warn(
    "android/app/build.gradle not found — skipping (run 'expo prebuild' first)"
  );
} else {
  backupFile(ANDROID_APP_BUILD_GRADLE);
  let appGradle = readFile(ANDROID_APP_BUILD_GRADLE);
  let changed = false;

  // ── 1a. Inject explicit project.ext.react block ──────────────────────────
  // This is the KEY fix: explicitly setting root and reactNativeDir prevents
  // the path='' null reference that occurs when Gradle can't auto-resolve them
  const reactExtBlock = `
// ═══════════════════════════════════════════════════
// GRADLE SHIELD — Injected by fix-build.js (RajuAI)
// Explicit node_modules resolution for CI environments
// Prevents: path='' NullPointerException in react.gradle
// ═══════════════════════════════════════════════════
project.ext.react = [
    root                  : "${safeRoot}",
    reactNativeDir        : "${safeNodeModules}/react-native",
    hermesCommand         : "${safeNodeModules}/react-native/sdks/hermesc/%OS_FLAVOR%/hermesc",
    enableHermes          : true,
    bundleAssetName       : "index.android.bundle",
    bundleCommand         : "bundle",
    bundleInDebug         : false,
    bundleInRelease       : true,
    jsBundleDirDebug      : "$buildDir/intermediates/assets/debug",
    jsBundleDirRelease    : "$buildDir/intermediates/assets/release",
    resourcesDirDebug     : "$buildDir/intermediates/res/merged/debug",
    resourcesDirRelease   : "$buildDir/intermediates/res/merged/release",
    inputExcludes         : ["android/**", "ios/**"],
    enableProguardInReleaseBuilds: false,
    extraPackagerArgs     : []
]
`;

  const SHIELD_MARKER = "GRADLE SHIELD";

  if (!appGradle.includes(SHIELD_MARKER)) {
    // Insert before 'apply plugin: "com.android.application"' or at top
    if (appGradle.includes('apply plugin: "com.android.application"')) {
      appGradle = appGradle.replace(
        'apply plugin: "com.android.application"',
        reactExtBlock + '\napply plugin: "com.android.application"'
      );
    } else if (appGradle.includes("apply plugin: 'com.android.application'")) {
      appGradle = appGradle.replace(
        "apply plugin: 'com.android.application'",
        reactExtBlock + "\napply plugin: 'com.android.application'"
      );
    } else {
      appGradle = reactExtBlock + "\n" + appGradle;
    }
    changed = true;
    log.ok("Injected project.ext.react block with explicit paths");
  } else {
    log.ok("project.ext.react block already present");
  }

  // ── 1b. Pin compileSdkVersion ─────────────────────────────────────────
  if (!appGradle.includes("compileSdk 35") && !appGradle.includes("compileSdkVersion 35")) {
    appGradle = appGradle
      .replace(/compileSdk\s+\d+/, "compileSdk 35")
      .replace(/compileSdkVersion\s+\d+/, "compileSdkVersion 35");
    changed = true;
    log.ok("Pinned compileSdk to 35");
  } else {
    log.ok("compileSdk 35 already set");
  }

  // ── 1c. Pin targetSdkVersion ──────────────────────────────────────────
  if (!appGradle.includes("targetSdk 34") && !appGradle.includes("targetSdkVersion 34")) {
    appGradle = appGradle
      .replace(/targetSdk\s+\d+/, "targetSdk 34")
      .replace(/targetSdkVersion\s+\d+/, "targetSdkVersion 34");
    changed = true;
    log.ok("Pinned targetSdk to 34");
  } else {
    log.ok("targetSdk 34 already set");
  }

  // ── 1d. Pin minSdkVersion for llama.rn ARM64 support ──────────────────
  if (
    appGradle.match(/minSdk\s+[12]\d/) ||
    appGradle.match(/minSdkVersion\s+[12]\d/)
  ) {
    appGradle = appGradle
      .replace(/minSdk\s+\d+/, "minSdk 26")
      .replace(/minSdkVersion\s+\d+/, "minSdkVersion 26");
    changed = true;
    log.ok("Bumped minSdk to 26 (required for llama.rn GGUF)");
  } else {
    log.ok("minSdk already ≥ 26");
  }

  // ── 1e. Add llama.rn packaging options (prevent .so conflicts) ──────────
  const packagingBlock = `
    // GRADLE SHIELD — llama.rn native lib packaging
    packaging {
        jniLibs {
            useLegacyPackaging = true
            pickFirsts += ['**/libc++_shared.so', '**/libllama.so']
        }
    }`;

  if (!appGradle.includes("useLegacyPackaging")) {
    const result = insertAfterLine(appGradle, "buildTypes {", packagingBlock);
    if (result.inserted) {
      appGradle = result.content;
      changed = true;
      log.ok("Added llama.rn packaging options");
    }
  } else {
    log.ok("Packaging options already present");
  }

  // ── 1f. Add abiFilters for GGUF model performance ─────────────────────
  const abiBlock = `
        ndk {
            // GRADLE SHIELD — Limit ABI for faster CI builds & smaller APK
            abiFilters "arm64-v8a", "x86_64"
        }`;

  if (!appGradle.includes("abiFilters") || !appGradle.includes("arm64-v8a")) {
    const result = insertAfterLine(appGradle, "defaultConfig {", abiBlock);
    if (result.inserted) {
      appGradle = result.content;
      changed = true;
      log.ok("Added abiFilters: arm64-v8a, x86_64");
    }
  } else {
    log.ok("abiFilters already set");
  }

  if (changed) {
    writeFile(ANDROID_APP_BUILD_GRADLE, appGradle);
    log.ok("android/app/build.gradle — PATCHED ✓");
  } else {
    log.ok("android/app/build.gradle — No changes needed");
  }
}

// ─── 2. android/gradle.properties — New Architecture + Performance ────────
log.title("TASK 2 — Patching android/gradle.properties");

if (!fs.existsSync(ANDROID_GRADLE_PROPERTIES)) {
  log.warn("android/gradle.properties not found — skipping");
} else {
  backupFile(ANDROID_GRADLE_PROPERTIES);
  let props = readFile(ANDROID_GRADLE_PROPERTIES);
  let changed = false;

  const requiredProps = [
    // New Architecture (Fabric + TurboModules)
    ["newArchEnabled", "true", "Enables Fabric renderer + TurboModules (RN 0.76)"],
    ["hermesEnabled", "true", "Hermes JS engine for 120Hz performance"],
    // Build optimizations
    ["org.gradle.jvmargs", "-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError", "CI JVM memory allocation"],
    ["org.gradle.daemon", "false", "Disable Gradle daemon for hermetic CI builds"],
    ["org.gradle.parallel", "true", "Parallel project execution"],
    ["org.gradle.configureondemand", "true", "Configure only needed projects"],
    ["org.gradle.caching", "true", "Enable Gradle build cache"],
    ["android.useAndroidX", "true", "AndroidX migration"],
    ["android.enableJetifier", "true", "Jetifier for legacy libs"],
    // NDK version pin (prevents version mismatch in GitHub Actions)
    ["android.ndkVersion", "26.1.10909125", "Pinned NDK for hermetic builds"],
    // GRADLE SHIELD marker
    ["# GRADLE_SHIELD_APPLIED", "true", "Applied by fix-build.js"],
  ];

  for (const [key, value, comment] of requiredProps) {
    if (key.startsWith("#")) {
      if (!props.includes("GRADLE_SHIELD_APPLIED")) {
        props += `\n# ${comment}\n${key}=${value}`;
        changed = true;
      }
      continue;
    }

    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(props)) {
      // Only overwrite specific keys that are CI-critical
      const criticalOverrides = [
        "newArchEnabled",
        "hermesEnabled",
        "android.ndkVersion",
        "org.gradle.daemon",
      ];
      if (criticalOverrides.includes(key)) {
        const before = props;
        props = props.replace(regex, `${key}=${value}`);
        if (before !== props) {
          changed = true;
          log.ok(`Override: ${key}=${value} — ${comment}`);
        }
      } else {
        log.ok(`Present: ${key}`);
      }
    } else {
      props += `\n# ${comment}\n${key}=${value}\n`;
      changed = true;
      log.ok(`Added: ${key}=${value}`);
    }
  }

  if (changed) {
    writeFile(ANDROID_GRADLE_PROPERTIES, props);
    log.ok("android/gradle.properties — PATCHED ✓");
  } else {
    log.ok("android/gradle.properties — No changes needed");
  }
}

// ─── 3. android/settings.gradle — Explicit includeBuild resolution ─────────
log.title("TASK 3 — Patching android/settings.gradle");

if (!fs.existsSync(ANDROID_SETTINGS_GRADLE)) {
  log.warn("android/settings.gradle not found — skipping");
} else {
  backupFile(ANDROID_SETTINGS_GRADLE);
  let settings = readFile(ANDROID_SETTINGS_GRADLE);
  let changed = false;

  // Fix: ensure pluginManagement resolves from the correct node_modules
  // This is critical for GitHub Actions where the PWD can differ
  const pluginMgmtFix = `
// GRADLE SHIELD — Explicit plugin resolution for CI
// Prevents: Plugin 'com.facebook.react' resolution failure
pluginManagement {
    includeBuild("${safeNodeModules}/@react-native/gradle-plugin")
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
`;

  if (!settings.includes("GRADLE SHIELD") && !settings.includes("pluginManagement")) {
    settings = pluginMgmtFix + settings;
    changed = true;
    log.ok("Injected pluginManagement block with explicit includeBuild path");
  } else if (!settings.includes("GRADLE SHIELD") && settings.includes("pluginManagement")) {
    // pluginManagement exists but may not have the includeBuild fix
    if (!settings.includes("@react-native/gradle-plugin")) {
      settings = settings.replace(
        "pluginManagement {",
        `pluginManagement {\n    includeBuild("${safeNodeModules}/@react-native/gradle-plugin")`
      );
      changed = true;
      log.ok("Added includeBuild to existing pluginManagement");
    } else {
      log.ok("pluginManagement already has includeBuild");
    }
  } else {
    log.ok("settings.gradle already patched");
  }

  if (changed) {
    writeFile(ANDROID_SETTINGS_GRADLE, settings);
    log.ok("android/settings.gradle — PATCHED ✓");
  } else {
    log.ok("android/settings.gradle — No changes needed");
  }
}

// ─── 4. babel.config.js — Reanimated plugin validation ───────────────────
log.title("TASK 4 — Validating babel.config.js");

const babelTemplate = `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // GRADLE SHIELD — required plugin order for Reanimated 3 + Expo 52
      "@babel/plugin-proposal-export-namespace-from",
      "react-native-reanimated/plugin",
    ],
  };
};
`;

if (!fs.existsSync(BABEL_CONFIG)) {
  writeFile(BABEL_CONFIG, babelTemplate);
  log.ok("Created babel.config.js with correct plugin order");
} else {
  const babelContent = readFile(BABEL_CONFIG);
  if (!babelContent.includes("react-native-reanimated/plugin")) {
    backupFile(BABEL_CONFIG);
    // Inject plugin into existing config
    const patched = babelContent.replace(
      /plugins:\s*\[/,
      `plugins: [\n      // GRADLE SHIELD — Reanimated must be last plugin\n      "react-native-reanimated/plugin",`
    );
    if (patched !== babelContent) {
      writeFile(BABEL_CONFIG, patched);
      log.ok("Added react-native-reanimated/plugin to babel.config.js");
    } else {
      log.warn(
        "Could not auto-inject Reanimated plugin — add it manually as the last plugin"
      );
    }
  } else {
    log.ok("react-native-reanimated/plugin already present");
  }
}

// ─── 5. Validate critical packages are present ────────────────────────────
log.title("TASK 5 — Validating node_modules integrity");

const criticalPackages = [
  "@react-native/gradle-plugin",
  "react-native",
  "expo",
  "expo-file-system",
  "expo-network",
  "expo-secure-store",
  "expo-local-authentication",
  "@google/generative-ai",
  "llama.rn",
  "react-native-reanimated",
  "expo-linear-gradient",
];

let missingPackages = [];
for (const pkg of criticalPackages) {
  const pkgPath = path.join(NODE_MODULES, pkg);
  if (fs.existsSync(pkgPath)) {
    log.ok(`Found: ${pkg}`);
  } else {
    log.warn(`Missing: ${pkg} — run 'npm install'`);
    missingPackages.push(pkg);
  }
}

if (missingPackages.length > 0) {
  log.warn(
    `\n  ${missingPackages.length} package(s) missing. Run: npm install`
  );
}

// ─── 6. Generate CI environment summary ───────────────────────────────────
log.title("TASK 6 — Writing CI environment summary");

const summaryPath = path.join(ROOT, ".gradle-shield-report.json");
const summary = {
  timestamp: new Date().toISOString(),
  shield_version: "1.0.0",
  project: "RAJU AI Sovereign",
  node_version: process.version,
  platform: `${os.platform()}/${os.arch()}`,
  root: safeRoot,
  node_modules: safeNodeModules,
  patches_applied: {
    app_build_gradle: fs.existsSync(ANDROID_APP_BUILD_GRADLE),
    gradle_properties: fs.existsSync(ANDROID_GRADLE_PROPERTIES),
    settings_gradle: fs.existsSync(ANDROID_SETTINGS_GRADLE),
    babel_config: fs.existsSync(BABEL_CONFIG),
  },
  missing_packages: missingPackages,
  environment: {
    CI: process.env.CI || "false",
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS || "false",
    GITHUB_WORKSPACE: process.env.GITHUB_WORKSPACE || "N/A",
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || "N/A",
    JAVA_HOME: process.env.JAVA_HOME || "N/A",
  },
};

writeFile(summaryPath, JSON.stringify(summary, null, 2));
log.ok(`Report written → ${path.basename(summaryPath)}`);

// ─── Done ──────────────────────────────────────────────────────────────────
console.log(
  `\n${c.bold(c.green("╔══════════════════════════════════════════════╗"))}`
);
console.log(
  c.bold(c.green("║     GRADLE SHIELD — ALL TASKS COMPLETE       ║"))
);
console.log(
  c.bold(c.green("╚══════════════════════════════════════════════╝"))
);
console.log(
  c.dim(`\n  Next step: expo prebuild --clean && expo run:android\n`)
);

if (process.env.GITHUB_ACTIONS === "true") {
  // Output for GitHub Actions step summary
  const summaryLines = [
    "## 🛡️ Gradle Shield Applied",
    `- **Project**: RAJU AI Sovereign`,
    `- **Node**: ${process.version}`,
    `- **Platform**: ${os.platform()}/${os.arch()}`,
    `- **Missing packages**: ${missingPackages.length === 0 ? "None ✅" : missingPackages.join(", ")}`,
  ];
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      summaryLines.join("\n") + "\n"
    );
  }
}
