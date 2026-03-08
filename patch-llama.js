#!/usr/bin/env node
"use strict";

const fs   = require("fs");
const path = require("path");

const ROOT          = process.cwd();
const NM            = path.join(ROOT, "node_modules");
const LLAMA_ROOT    = path.join(NM, "llama.rn");
const LLAMA_ANDROID = path.join(LLAMA_ROOT, "android");
const LLAMA_SRC     = path.join(LLAMA_ANDROID, "src", "main", "java", "com", "rnllama");

const read  = (p) => fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
const write = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, d, "utf8"); };

console.log("\n[RAJU AI] — Running llama.rn New Arch Patcher v2.0...");

if (!fs.existsSync(LLAMA_ROOT)) {
  console.log("llama.rn not found. Run npm install first.");
  process.exit(0);
}

// 1. Patch package.json
const pkgPath = path.join(LLAMA_ROOT, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(read(pkgPath));
  pkg.codegenConfig = {
    name: "RNLlama",
    type: "modules",
    jsSrcsDir: "src",
    android: { javaPackageName: "com.rnllama" }
  };
  write(pkgPath, JSON.stringify(pkg, null, 2));
}

// 2. Patch build.gradle
const gradlePath = path.join(LLAMA_ANDROID, "build.gradle");
if (fs.existsSync(gradlePath)) {
  let gradle = read(gradlePath);
  if (!gradle.includes('com.facebook.react')) {
      gradle = gradle.replace(/apply plugin: ["']com\.android\.library["']/, 'apply plugin: "com.android.library"\napply plugin: "com.facebook.react"');
  }
  if (!gradle.includes("sourceSets")) {
      const ss = `\nandroid {\n    sourceSets { main { java { srcDirs += ["src/codegen/java"] } } }\n`;
      gradle = gradle.replace("android {", ss);
  }
  write(gradlePath, gradle);
}

// 3. Synthesize NativeRNLlamaSpec.java
const specDir = path.join(LLAMA_ANDROID, "src", "codegen", "java", "com", "rnllama");
const specPath = path.join(specDir, "NativeRNLlamaSpec.java");
const specContent = `package com.rnllama;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import androidx.annotation.NonNull;

public interface NativeRNLlamaSpec extends TurboModule {
  @NonNull String getName();
  void initContext(ReadableMap params, Promise promise);
  void releaseContext(double contextId, Promise promise);
  void releaseAllContexts(Promise promise);
  void completion(double contextId, ReadableMap params, Promise promise);
  void stopCompletion(double contextId, Promise promise);
  void tokenize(double contextId, String text, Promise promise);
  void detokenize(double contextId, ReadableArray tokens, Promise promise);
  void embedding(double contextId, String text, Promise promise);
  void getEmbeddingResult(double contextId, ReadableMap params, Promise promise);
  void loadSession(double contextId, String sessionPath, Promise promise);
  void saveSession(double contextId, String sessionPath, int size, Promise promise);
  void applyLoraAdapters(double contextId, ReadableArray loraAdapters, Promise promise);
  void removeLoraAdapters(double contextId, Promise promise);
  void getLoadedLoraAdapters(double contextId, Promise promise);
  void bench(double contextId, int pp, int tg, int pl, int nr, Promise promise);
}`;
write(specPath, specContent);

// 4. Patch RNLlamaModule.java
const modulePath = path.join(LLAMA_SRC, "RNLlamaModule.java");
if (fs.existsSync(modulePath)) {
  let moduleJava = read(modulePath);
  if (!moduleJava.includes("implements NativeRNLlamaSpec")) {
      moduleJava = moduleJava.replace("extends ReactContextBaseJavaModule", "extends ReactContextBaseJavaModule implements NativeRNLlamaSpec");
      write(modulePath, moduleJava);
  }
}
console.log("[RAJU AI] — llama.rn is now Fabric-compatible! ✓\n");
