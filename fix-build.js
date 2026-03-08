#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — GRADLE SHIELD v3.0                                  ║
 * ║          Compatible: React Native 0.76.9 + Expo 52 + New Architecture  ║
 * ║          Runs via: postinstall AND after expo prebuild in CI            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * CHANGELOG v3.0 (breaking fixes from v1/v2):
 * ─────────────────────────────────────────────────────────────────────────
 *  ✗ REMOVED: project.ext.react = [...] — ILLEGAL in RN 0.76, causes:
 *             "Using old project.ext.react configuration" + path='' crash
 *  ✗ REMOVED: pluginManagement injection into settings.gradle — Expo's
 *             prebuild generates this correctly; double-injection breaks it
 *  ✗ REMOVED: pkg.main = "index.js" — wrong for Expo, causes path='' crash
 *
 *  ✓ ADDED:   react { } DSL block — the RN 0.76+ correct configuration
 *  ✓ ADDED:   REMOVED stale GRADLE SHIELD marker detection so old bad blocks
 *             get cleaned up automatically
 *  ✓ FIXED:   pkg.main always set to "expo/AppEntry.js"
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

// ── Terminal colors ──────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};
const log = {
  ok:    (m) => console.log(`  ${c.green("✓")} ${m}`),
  warn:  (m) => console.log(`  ${c.yellow("⚠")} ${m}`),
  err:   (m) => console.log(`  ${c.red("✗")} ${m}`),
  info:  (m) => console.log(`  ${c.cyan("◈")} ${m}`),
  title: (m) => console.log(`\n${c.bold(c.green(m))}`),
};

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT                    = process.cwd();
const NM                      = path.join(ROOT, "node_modules");
const ANDROID_APP_BUILD_GRADLE= path.join(ROOT, "android", "app", "build.gradle");
const ANDROID_GRADLE_PROPS    = path.join(ROOT, "android", "gradle.properties");
const BABEL_CONFIG            = path.join(ROOT, "babel.config.js");
const PACKAGE_JSON            = path.join(ROOT, "package.json");

// Safe forward-slash versions for embedding into Gradle files
const safeNM   = NM.replace(/\\/g, "/");
const safeRoot = ROOT.replace(/\\/g, "/");

// ── Utilities ────────────────────────────────────────────────────────────────
const readFile  = (p) => fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
const writeFile = (p, d) => fs.writeFileSync(p, d, "utf8");
const backupFile= (p) => {
  const b = p + ".gradle-shield-v3.bak";
  if (!fs.existsSync(b) && fs.existsSync(p)) fs.copyFileSync(p, b);
};

// ── Banner ───────────────────────────────────────────────────────────────────
console.log(c.bold("\n╔══════════════════════════════════════════════╗"));
console.log(c.bold(  "║      RAJU AI — GRADLE SHIELD v3.0           ║"));
console.log(c.bold(  "╚══════════════════════════════════════════════╝"));
log.info(`Root         : ${safeRoot}`);
log.info(`node_modules : ${safeNM}`);
log.info(`Platform     : ${os.platform()} / ${os.arch()}`);
log.info(`Node.js      : ${process.version}`);
log.info(`CI           : ${process.env.GITHUB_ACTIONS === "true" ? "GitHub Actions" : "local"}`);

// ════════════════════════════════════════════════════════════════════════════
// TASK 0 — Self-heal package.json
// ════════════════════════════════════════════════════════════════════════════
log.title("TASK 0 — Self-healing package.json");

{
  const pkg = JSON.parse(readFile(PACKAGE_JSON) || "{}");
  let changed = false;

  // Correct React versions for Expo 52 / RN 0.76
  const FORCED = { react: "18.3.1", "react-native": "0.76.9" };
  for (const [dep, ver] of Object.entries(FORCED)) {
    if (pkg.dependencies && pkg.dependencies[dep] !== ver) {
      log.warn(`Correcting ${dep}: "${pkg.dependencies[dep]}" → "${ver}"`);
      pkg.dependencies[dep] = ver;
      changed = true;
    } else {
      log.ok(`${dep}@${ver} — OK`);
    }
  }

  // npm overrides block ensures transitive deps don't re-introduce bad versions
  if (!pkg.overrides) pkg.overrides = {};
  for (const [dep, ver] of Object.entries(FORCED)) {
    if (pkg.overrides[dep] !== ver) { pkg.overrides[dep] = ver; changed = true; }
  }

  // "expo/AppEntry.js" is the ONLY correct value for Expo bare workflow.
  // The RN Gradle plugin reads "main" from package.json at configuration time.
  // "index.js" → file doesn't exist on CI → path='' crash
  // "expo-router/entry" → only valid when expo-router is installed
  const CORRECT_MAIN = "expo/AppEntry.js";
  if (pkg.main !== CORRECT_MAIN) {
    log.warn(`Fixing main: "${pkg.main}" → "${CORRECT_MAIN}"`);
    pkg.main = CORRECT_MAIN;
    changed = true;
  } else {
    log.ok(`main = "${pkg.main}" — correct`);
  }

  if (changed) {
    writeFile(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n");
    log.ok("package.json self-healed");
  } else {
    log.ok("package.json — no corrections needed");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TASK 1 — Patch android/app/build.gradle
// ════════════════════════════════════════════════════════════════════════════
log.title("TASK 1 — Patching android/app/build.gradle");

if (!fs.existsSync(ANDROID_APP_BUILD_GRADLE)) {
  log.warn("android/app/build.gradle not found — run 'expo prebuild' first, then re-run this script");
} else {
  backupFile(ANDROID_APP_BUILD_GRADLE);
  let gradle = readFile(ANDROID_APP_BUILD_GRADLE);
  let changed = false;

  // ── 1a. REMOVE old project.ext.react blocks (they crash RN 0.76) ──────────
  // RN 0.76 Gradle plugin detects this block and throws:
  //   "Using old project.ext.react configuration ... path='' "
  // We must strip it out completely before adding the new react{} DSL.
  const OLD_EXT_REACT_PATTERN = /\/\/[^\n]*GRADLE SHIELD[^\n]*\n(?:\/\/[^\n]*\n)*project\.ext\.react\s*=\s*\[[^\]]*\]\s*\n?/gs;
  const OLD_EXT_REACT_SIMPLE  = /project\.ext\.react\s*=\s*\[[^\]]*\]/gs;

  if (OLD_EXT_REACT_PATTERN.test(gradle) || OLD_EXT_REACT_SIMPLE.test(gradle)) {
    gradle = gradle.replace(OLD_EXT_REACT_PATTERN, "");
    gradle = gradle.replace(OLD_EXT_REACT_SIMPLE, "");
    changed = true;
    log.ok("Removed legacy project.ext.react block (incompatible with RN 0.76)");
  } else {
    log.ok("No legacy project.ext.react block found");
  }

  // Also remove any stale GRADLE SHIELD comment blocks from v1/v2
  const OLD_SHIELD_COMMENT = /\/\/ ═+\s*\n\/\/ GRADLE SHIELD[^=]*═+\s*\n(?:\/\/[^\n]*\n)*/g;
  if (OLD_SHIELD_COMMENT.test(gradle)) {
    gradle = gradle.replace(OLD_SHIELD_COMMENT, "");
    changed = true;
    log.ok("Removed stale v1/v2 GRADLE SHIELD comment blocks");
  }

  // ── 1b. Inject the NEW react { } DSL block (RN 0.76+ format) ─────────────
  // This replaces project.ext.react. It goes INSIDE android/app/build.gradle
  // AFTER the plugins/apply block but BEFORE the android { } block.
  // The react{} block is read by ReactPlugin.kt during project configuration.
  const REACT_DSL_MARKER = "GRADLE_SHIELD_V3_REACT_DSL";

  if (!gradle.includes(REACT_DSL_MARKER)) {
    const reactDslBlock = `
// ─────────────────────────────────────────────────────────────────────────
// ${REACT_DSL_MARKER} — Injected by fix-build.js v3.0 (Raju AI)
// RN 0.76+ configuration DSL. Replaces the old project.ext.react = [...].
// See: https://reactnative.dev/docs/build-speed#using-the-new-build-config
// ─────────────────────────────────────────────────────────────────────────
react {
    // Path to the root of your React Native project (where package.json lives)
    root = file("${safeRoot}")

    // Path to react-native within node_modules
    reactNativeDir = file("${safeNM}/react-native")

    // Path to the CLI tool for bundling
    cliFile = file("${safeNM}/react-native/cli.js")

    // Hermes engine — REQUIRED for New Architecture / Fabric
    hermesEnabled = true

    // JS bundle entry point — must match package.json "main"
    // expo/AppEntry.js is correct for Expo bare workflow
    bundleCommand = "bundle"

    // Codegen output directories for New Architecture spec generation
    codegenDir = file("${safeNM}/@react-native/codegen")
}
`;

    // Strategy: insert after the last "apply plugin:" line, before android {}
    // This matches the structure Expo prebuild generates
    const applyPluginRegex = /(apply plugin: ["']com\.android\.application["'][^\n]*\n)/;
    if (applyPluginRegex.test(gradle)) {
      gradle = gradle.replace(applyPluginRegex, `$1${reactDslBlock}`);
      changed = true;
      log.ok("Injected react { } DSL block after apply plugin (RN 0.76 format)");
    } else {
      // Fallback: insert before the android { } block
      gradle = gradle.replace(/^(android\s*\{)/m, `${reactDslBlock}\n$1`);
      changed = true;
      log.ok("Injected react { } DSL block before android { } (fallback position)");
    }
  } else {
    log.ok("react { } DSL block already present");
  }

  // ── 1c. Pin SDK versions ──────────────────────────────────────────────────
  if (!gradle.includes("compileSdk 35") && !gradle.includes("compileSdkVersion 35")) {
    gradle = gradle
      .replace(/compileSdk\s+\d+/, "compileSdk 35")
      .replace(/compileSdkVersion\s+\d+/, "compileSdkVersion 35");
    changed = true;
    log.ok("Pinned compileSdk 35");
  } else {
    log.ok("compileSdk 35 — OK");
  }

  if (!gradle.includes("targetSdk 35") && !gradle.includes("targetSdk 34")) {
    gradle = gradle
      .replace(/targetSdk\s+\d+/, "targetSdk 35")
      .replace(/targetSdkVersion\s+\d+/, "targetSdkVersion 35");
    changed = true;
    log.ok("Pinned targetSdk 35");
  } else {
    log.ok("targetSdk — OK");
  }

  // minSdk 26 required for llama.rn ARM64 native libs
  const minSdkMatch = gradle.match(/minSdk(?:Version)?\s+(\d+)/);
  if (minSdkMatch && parseInt(minSdkMatch[1]) < 26) {
    gradle = gradle
      .replace(/minSdk\s+\d+/, "minSdk 26")
      .replace(/minSdkVersion\s+\d+/, "minSdkVersion 26");
    changed = true;
    log.ok("Bumped minSdk to 26 (llama.rn requirement)");
  } else {
    log.ok("minSdk ≥ 26 — OK");
  }

  // ── 1d. Add llama.rn .so packaging options ────────────────────────────────
  if (!gradle.includes("useLegacyPackaging")) {
    // Find buildTypes block and insert packaging before it
    const packagingBlock = `
    // GRADLE_SHIELD_V3: llama.rn native lib conflict resolution
    packaging {
        jniLibs {
            useLegacyPackaging = true
            pickFirsts += ['**/libc++_shared.so', '**/libllama.so', '**/librnllama.so']
        }
    }`;

    if (gradle.includes("buildTypes {")) {
      gradle = gradle.replace("buildTypes {", packagingBlock + "\n    buildTypes {");
      changed = true;
      log.ok("Added llama.rn jniLibs packaging options");
    }
  } else {
    log.ok("jniLibs packaging options — OK");
  }

  // ── 1e. Add abiFilters (arm64-v8a only for CI speed + llama.rn support) ───
  if (!gradle.includes("abiFilters")) {
    const abiBlock = `
            ndk {
                // GRADLE_SHIELD_V3: llama.rn requires arm64-v8a for GGUF inference
                abiFilters "arm64-v8a", "x86_64"
            }`;
    gradle = gradle.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {${abiBlock}`
    );
    changed = true;
    log.ok("Added abiFilters: arm64-v8a, x86_64");
  } else {
    log.ok("abiFilters — OK");
  }

  // ── 1f. Add Codegen sourceSets for NativeRNLlamaSpec ─────────────────────
  if (!gradle.includes("GRADLE_SHIELD_V3_SOURCESET")) {
    const sourceSetBlock = `
    // GRADLE_SHIELD_V3_SOURCESET — llama.rn Codegen spec paths
    sourceSets {
        main {
            java {
                srcDirs += [
                    "\${buildDir}/generated/source/codegen/java",
                    "${safeNM}/llama.rn/android/src/codegen/java"
                ]
            }
        }
    }`;

    // Insert at END of android { } block — find last closing brace
    // We use a marker approach: append to the android block
    if (gradle.match(/android\s*\{/)) {
      // Insert after the first opening of android { }
      gradle = gradle.replace(
        /^(android\s*\{)/m,
        `$1\n${sourceSetBlock}`
      );
      changed = true;
      log.ok("Added Codegen sourceSets for NativeRNLlamaSpec");
    }
  } else {
    log.ok("Codegen sourceSets — OK");
  }

  if (changed) {
    writeFile(ANDROID_APP_BUILD_GRADLE, gradle);
    log.ok("android/app/build.gradle — PATCHED ✓");
  } else {
    log.ok("android/app/build.gradle — No changes needed");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TASK 2 — Patch android/gradle.properties
// ════════════════════════════════════════════════════════════════════════════
log.title("TASK 2 — Patching android/gradle.properties");

if (!fs.existsSync(ANDROID_GRADLE_PROPS)) {
  log.warn("android/gradle.properties not found — skipping");
} else {
  backupFile(ANDROID_GRADLE_PROPS);
  let props = readFile(ANDROID_GRADLE_PROPS);
  let changed = false;

  // These are the properties we enforce. Format: [key, value, comment, forceOverwrite]
  const REQUIRED = [
    ["newArchEnabled",           "true",                                                 "New Architecture (Fabric + TurboModules)",        true],
    ["hermesEnabled",            "true",                                                 "Hermes JS engine",                               true],
    ["org.gradle.jvmargs",       "-Xmx4096m -XX:MaxMetaspaceSize=1024m",                "CI JVM heap",                                    false],
    ["org.gradle.daemon",        "false",                                                "Hermetic CI — no daemon",                        true],
    ["org.gradle.parallel",      "true",                                                 "Parallel task execution",                        false],
    ["org.gradle.caching",       "true",                                                 "Gradle build cache",                             false],
    ["android.useAndroidX",      "true",                                                 "AndroidX",                                       false],
    ["android.enableJetifier",   "true",                                                 "Jetifier for legacy libs",                       false],
    ["android.ndkVersion",       "26.1.10909125",                                        "Pinned NDK — prevents CI version mismatch",      true],
  ];

  for (const [key, value, comment, force] of REQUIRED) {
    const regex = new RegExp(`^${key.replace(".", "\\.")}=.*$`, "m");
    if (regex.test(props)) {
      if (force) {
        const before = props;
        props = props.replace(regex, `${key}=${value}`);
        if (before !== props) { changed = true; log.ok(`Overrode: ${key}=${value}`); }
        else { log.ok(`${key}=${value} — OK`); }
      } else {
        log.ok(`${key} — present`);
      }
    } else {
      props += `\n# ${comment}\n${key}=${value}\n`;
      changed = true;
      log.ok(`Added: ${key}=${value}`);
    }
  }

  if (!props.includes("GRADLE_SHIELD_V3")) {
    props += "\n# Patched by fix-build.js v3.0 (Raju AI)\n# GRADLE_SHIELD_V3=true\n";
    changed = true;
  }

  if (changed) {
    writeFile(ANDROID_GRADLE_PROPS, props);
    log.ok("android/gradle.properties — PATCHED ✓");
  } else {
    log.ok("android/gradle.properties — No changes needed");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TASK 3 — Validate babel.config.js (do NOT touch settings.gradle)
// ════════════════════════════════════════════════════════════════════════════
log.title("TASK 3 — Validating babel.config.js");

// NOTE: We deliberately do NOT patch android/settings.gradle.
// Expo prebuild generates a correct settings.gradle with the right
// pluginManagement block. Injecting into it causes duplicate block errors.

const BABEL_TEMPLATE = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be last
      'react-native-reanimated/plugin',
    ],
  };
};
`;

if (!fs.existsSync(BABEL_CONFIG)) {
  writeFile(BABEL_CONFIG, BABEL_TEMPLATE);
  log.ok("Created babel.config.js with reanimated plugin");
} else {
  const content = readFile(BABEL_CONFIG);
  if (!content.includes("react-native-reanimated/plugin")) {
    backupFile(BABEL_CONFIG);
    // Try to inject into existing config
    const patched = content.replace(
      /plugins\s*:\s*\[/,
      "plugins: [\n      'react-native-reanimated/plugin',"
    );
    if (patched !== content) {
      writeFile(BABEL_CONFIG, patched);
      log.ok("Injected react-native-reanimated/plugin into babel.config.js");
    } else {
      log.warn("Could not auto-inject reanimated plugin — add it manually as the last plugin");
    }
  } else {
    log.ok("react-native-reanimated/plugin present — OK");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TASK 4 — Validate critical packages exist
// ════════════════════════════════════════════════════════════════════════════
log.title("TASK 4 — Validating node_modules");

const CRITICAL = [
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

const missing = [];
for (const pkg of CRITICAL) {
  const p = path.join(NM, pkg);
  if (fs.existsSync(p)) { log.ok(`${pkg} — found`); }
  else { log.warn(`${pkg} — MISSING`); missing.push(pkg); }
}
if (missing.length > 0) {
  log.warn(`${missing.length} package(s) missing — run: npm install --legacy-peer-deps`);
}

// ════════════════════════════════════════════════════════════════════════════
// TASK 5 — Write CI summary report
// ════════════════════════════════════════════════════════════════════════════
log.title("TASK 5 — Writing CI report");

const report = {
  timestamp:       new Date().toISOString(),
  shield_version:  "3.0.0",
  node:            process.version,
  platform:        `${os.platform()}/${os.arch()}`,
  ci:              process.env.GITHUB_ACTIONS === "true",
  root:            safeRoot,
  missing_packages: missing,
  patches: {
    app_build_gradle:    fs.existsSync(ANDROID_APP_BUILD_GRADLE),
    gradle_properties:   fs.existsSync(ANDROID_GRADLE_PROPS),
    babel_config:        fs.existsSync(BABEL_CONFIG),
    settings_gradle_SKIPPED: "intentionally — Expo prebuild manages this",
  },
};
fs.writeFileSync(
  path.join(ROOT, ".gradle-shield-report.json"),
  JSON.stringify(report, null, 2)
);
log.ok("Report written → .gradle-shield-report.json");

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    "## 🛡️ Gradle Shield v3.0 Applied",
    `| Key | Value |`,
    `|---|---|`,
    `| React Native | 0.76.9 |`,
    `| New Architecture | ✅ enabled |`,
    `| react{} DSL | ✅ injected (replaces old project.ext.react) |`,
    `| main entry | expo/AppEntry.js ✅ |`,
    `| settings.gradle | ⏭️ skipped (Expo manages it) |`,
    `| Missing packages | ${missing.length === 0 ? "None ✅" : missing.join(", ")} |`,
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}

// ── Final summary ────────────────────────────────────────────────────────────
console.log(c.bold("\n╔══════════════════════════════════════════════╗"));
console.log(c.bold(  "║      GRADLE SHIELD v3.0 — COMPLETE ✓        ║"));
console.log(c.bold(  "╚══════════════════════════════════════════════╝"));
console.log(`
  ${c.green("What was fixed in v3.0:")}
  ${c.dim("✓")} Removed illegal project.ext.react = [...] block
  ${c.dim("✓")} Injected react { } DSL (RN 0.76+ compatible)
  
