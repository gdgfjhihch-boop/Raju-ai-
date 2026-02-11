import type { ExpoConfig } from "expo/config";

const bundleId = "space.manus.rajuai.agent";
const scheme = "rajuai";

const config: ExpoConfig = {
  name: "Raju-ai- Agent",
  slug: "raju-ai-agent",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#2D3561",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    package: bundleId,
    permissions: [
      "POST_NOTIFICATIONS",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "INTERNET",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
