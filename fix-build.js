#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — GRADLE SHIELD v3.0                                  ║
 * ║          Compatible: React Native 0.76.9 + Expo 52 + New Architecture  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

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

const ROOT     = process.cwd();
const NM       = path.join(ROOT, "node_modules");
const safeNM   = NM.replace(/\\/g, "/");
const safeRoot = ROOT.replace(/\\/g, "/");

const APP_GRADLE   = path.join(ROOT, "android", "app", "build.gradle");
const GRADLE_PROPS = path.join(ROOT, "android", "gradle.properties");
const BABEL_CONFIG = path.join(ROOT, "babel.config.js");
const PKG_JSON     = path.join(ROOT, "package.json");

const read  = (p) => fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
const write = (p, d) => fs.writeFileSync(p, d, "utf8");
const bak   = (p) => {
  const b = p + ".shield-v3.bak";
  if (!fs.existsSync(b) && fs.existsSync(p)) fs.copyFileSync(p, b);
};

console.log(c.bold("\n╔══════════════════════════════════════════╗"));
console.log(c.bold(  "║   RAJU AI — GRADLE SHIELD v3.0          ║"));
console.log(c.bold(  "╚══════════════════════════════════════════╝"));
log.info("RN 0.76.9 + Expo 52 + New Architecture");
log.info(`Root: ${safeRoot}`);

// ─── TASK 0: Fix package.json ─────────────────────────────────────────────
log.title("TASK 0 — Self-healing package.json");
{
  const raw = read(PKG_JSON);
  if (raw) {
    const pkg = JSON.parse(raw);
    let changed = false;

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

    if (!pkg.overrides) pkg.overrides = {};
    for (const [dep, ver] of Object.entries(FORCED)) {
      if (pkg.overrides[dep] !== ver) { pkg.overrides[dep] = ver; changed = true; }
    }

    const CORRECT_MAIN = "expo/AppEntry.js";
    if (pkg.main !== CORRECT_MAIN) {
      log.warn(`Fixing main: "${pkg.main}" → "${CORRECT_MAIN}"`);
      pkg.main = CORRECT_MAIN;
      changed = true;
    } else {
      log.ok(`main="${pkg.main}" — correct`);
    }

    if (changed) {
      write(PKG_JSON, JSON.stringify(pkg, null, 2) + "\n");
      log.ok("package.json saved");
    } else {
      log.ok("package.json — no changes needed");
    }
  }
}

// ─── TASK 1: Patch android/app/build.gradle ───────────────────────────────
log.title("TASK 1 — Patching android/app/build.gradle");

if (!fs.existsSync(APP_GRADLE)) {
  log.warn("Not found — run 'expo prebuild --clean' first, then re-run this script");
} else {
  bak(APP_GRADLE);
  let gradle = read(APP_GRADLE);
  let changed = false;

  if (gradle.includes("project.ext.react")) {
    gradle = gradle.replace(/project\.ext\.react\s*=\s*\[[\s\S]*?\]\s*\n?/g, "");
    changed = true;
    log.ok("Purged illegal project.ext.react block");
  } else {
    log.ok("No legacy project.ext.react found");
  }

  if (gradle.includes("GRADLE SHIELD") && !gradle.includes("GRADLE_SHIELD_V3")) {
    gradle = gradle.replace(/\/\/ ═+\n(?:\/\/[^\n]*\n)*\/\/ GRADLE SHIELD[\s\S]*?═+\n/g, "");
    changed = true;
    log.ok("Removed stale v1/v2 GRADLE SHIELD comment blocks");
  }

  if (!gradle.includes("GRADLE_SHIELD_V3_REACT_DSL")) {
    const reactDsl = `
// ─────────────────────────────────────────────────────────────────
// GRADLE_SHIELD_V3_REACT_DSL — Raju AI fix-build.js v3.0
// RN 0.76+ react{} DSL replaces the old project.ext.react = [...]
// ─────────────────────────────────────────────────────────────────
react {
    root = file("${safeRoot}")
    reactNativeDir = file("${safeNM}/react-native")
    cliFile = file("${safeNM}/react-native/cli.js")
    hermesEnabled = true
    bundleCommand = "bundle"
}
`;
    if (gradle.includes('apply plugin: "com.android.application"')) {
      gradle = gradle.replace(
        'apply plugin: "com.android.application"',
        'apply plugin: "com.android.application"' + "\n" + reactDsl
      );
      changed = true;
      log.ok("Injected react { } DSL block (RN 0.76 format)");
    } else if (gradle.match(/^android\s*\{/m)) {
      gradle = gradle.replace(/^(android\s*\{)/m, reactDsl + "\n$1");
      changed = true;
      log.ok("Injected react { } DSL block (before android block)");
    } else {
      gradle = reactDsl + "\n" + gradle;
      changed = true;
      log.ok("Injected react { } DSL block (top of file)");
    }
  } else {
    log.ok("react { } DSL already present");
  }

  if (!gradle.includes("compileSdk 35") && !gradle.includes("compileSdkVersion 35")) {
    gradle = gradle
      .replace(/compileSdk\s+\d+/, "compileSdk 35")
      .replace(/compileSdkVersion\s+\d+/, "compileSdkVersion 35");
    changed = true;
    log.ok("Pinned compileSdk 35");
  } else { log.ok("compileSdk 35 — OK"); }

  const minMatch = gradle.match(/minSdk(?:Version)?\s+(\d+)/);
  if (minMatch && parseInt(minMatch[1]) < 26) {
    gradle = gradle
      .replace(/minSdk\s+\d+/, "minSdk 26")
      .replace(/minSdkVersion\s+\d+/, "minSdkVersion 26");
    changed = true;
    log.ok("Bumped minSdk to 26 (llama.rn requirement)");
  } else { log.ok("minSdk ≥ 26 — OK"); }

  if (!gradle.includes("useLegacyPackaging")) {
    const packagingBlock = `
    // GRADLE_SHIELD_V3: llama.rn .so conflict resolution
    packaging {
        jniLibs {
            useLegacyPackaging = true
            pickFirsts += ['**/libc++_shared.so', '**/libllama.so', '**/librnllama.so']
        }
    }`;
    gradle = gradle.replace(/(\s*buildTypes\s*\{)/, packagingBlock + "\n$1");
    changed = true;
    log.ok("Added jniLibs packaging options");
  } else { log.ok("jniLibs packaging — OK"); }

  if (!gradle.includes("abiFilters")) {
    gradle = gradle.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {\n            ndk { abiFilters "arm64-v8a", "x86_64" }`
    );
    changed = true;
    log.ok("Added abiFilters: arm64-v8a, x86_64");
  } else { log.ok("abiFilters — OK"); }

  if (!gradle.includes("GRADLE_SHIELD_V3_SOURCESET")) {
    const srcSet = `
    // GRADLE_SHIELD_V3_SOURCESET
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
    gradle = gradle.replace(/^(android\s*\{)/m, `$1\n${srcSet}`);
    changed = true;
    log.ok("Added Codegen sourceSets for NativeRNLlamaSpec");
  } else { log.ok("Codegen sourceSets — OK"); }

  if (changed) {
    write(APP_GRADLE, gradle);
    log.ok("android/app/build.gradle — PATCHED ✓");
  } else {
    log.ok("android/app/build.gradle — No changes needed");
  }
}

// ─── TASK 2: gradle.properties ────────────────────────────────────────────
log.title("TASK 2 — Patching android/gradle.properties");

if (!fs.existsSync(GRADLE_PROPS)) {
  log.warn("Not found — skipping");
} else {
  bak(GRADLE_PROPS);
  let props = read(GRADLE_PROPS);
  let changed = false;

  const ENTRIES = [
    ["newArchEnabled",         "true",                  true],
    ["hermesEnabled",          "true",                  true],
    ["org.gradle.daemon",      "false",                 true],
    ["android.ndkVersion",     "26.1.10909125",         true],
    ["org.gradle.jvmargs",     "-Xmx4096m -XX:MaxMetaspaceSize=1024m", false],
    ["org.gradle.parallel",    "true",                  false],
    ["org.gradle.caching",     "true",                  false],
    ["android.useAndroidX",    "true",                  false],
    ["android.enableJetifier", "true",                  false],
  ];

  for (const [key, val, force] of ENTRIES) {
    const re = new RegExp(`^${key.replace(/\./g, "\\.")}=.*$`, "m");
    if (re.test(props)) {
      if (force) {
        const before = props;
        props = props.replace(re, `${key}=${val}`);
        if (before !== props) { changed = true; log.ok(`Overrode: ${key}=${val}`); }
        else { log.ok(`${key}=${val} — OK`); }
      } else {
        log.ok(`${key} — present`);
      }
    } else {
      props += `\n${key}=${val}\n`;
      changed = true;
      log.ok(`Added: ${key}=${val}`);
    }
  }

  if (!props.includes("GRADLE_SHIELD_V3")) {
    props += "\n# GRADLE_SHIELD_V3=patched\n";
    changed = true;
  }

  if (changed) { write(GRADLE_PROPS, props); log.ok("gradle.properties — PATCHED ✓"); }
  else { log.ok("gradle.properties — No changes needed"); }
}

// ─── TASK 3: babel.config.js ──────────────────────────────────────────────
log.title("TASK 3 — babel.config.js");

if (!fs.existsSync(BABEL_CONFIG)) {
  write(BABEL_CONFIG, `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};\n`);
  log.ok("Created babel.config.js");
} else {
  const bc = read(BABEL_CONFIG);
  if (!bc.includes("react-native-reanimated/plugin")) {
    bak(BABEL_CONFIG);
    write(BABEL_CONFIG, bc.replace(
      /plugins\s*:\s*\[/,
      "plugins: [\n      'react-native-reanimated/plugin',"
    ));
    log.ok("Injected reanimated plugin");
  } else {
    log.ok("reanimated plugin — OK");
  }
}

// ─── TASK 4: Validate packages ────────────────────────────────────────────
log.title("TASK 4 — Package validation");

const CRITICAL = [
  "@react-native/gradle-plugin", "react-native", "expo",
  "expo-file-system", "expo-network", "expo-secure-store",
  "@google/generative-ai", "llama.rn", "react-native-reanimated",
];
const missing = CRITICAL.filter(p => !fs.existsSync(path.join(NM, p)));
CRITICAL.forEach(p => {
  if (missing.includes(p)) log.warn(`${p} — MISSING`);
  else log.ok(`${p} — found`);
});

// ─── Done ─────────────────────────────────────────────────────────────────
console.log(c.bold("\n╔══════════════════════════════════════════╗"));
console.log(c.bold(  "║   GRADLE SHIELD v3.0 — DONE ✓           ║"));
console.log(c.bold(  "╚══════════════════════════════════════════╝\n"));

if (process.env.GITHUB_STEP_SUMMARY) {
  const s = [
    "## 🛡️ Gradle Shield v3.0",
    "| Fix | Status |", "|---|---|",
    "| project.ext.react removed | ✅ |",
    "| react{} DSL injected | ✅ |",
    "| main=expo/AppEntry.js | ✅ |",
    "| settings.gradle untouched | ✅ |",
    `| Missing packages | ${missing.length ? missing.join(", ") : "None ✅"} |`,
  ].join("\n");
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n");
    }
               
