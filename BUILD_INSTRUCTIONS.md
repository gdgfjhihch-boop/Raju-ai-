# Raju-ai- Agent - APK Build Instructions

## Prerequisites

- Node.js 18+ and npm/pnpm
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android SDK (for local builds)
- Valid Expo account (for EAS builds)

## Build Methods

### Method 1: EAS Cloud Build (Recommended)

1. **Login to Expo**:
```bash
eas login
```

2. **Configure Build**:
```bash
eas build --platform android --type apk
```

3. **Monitor Build**:
- Follow the provided URL to track build progress
- Build typically completes in 10-15 minutes

4. **Download APK**:
- Once complete, download the APK from the provided link
- APK will be approximately 45-50MB

### Method 2: Local Build

1. **Install Dependencies**:
```bash
cd /home/ubuntu/raju-ai-agent
pnpm install
```

2. **Build APK**:
```bash
eas build --platform android --type apk --local
```

3. **Output Location**:
- APK will be saved to: `dist/raju-ai-agent.apk`

## APK Specifications

- **Filename**: raju-ai-agent-release.apk
- **Size**: ~45-50MB
- **Min Android**: 10 (API 29)
- **Target Android**: 14+ (API 34+)
- **Architecture**: arm64-v8a, armeabi-v7a
- **Bundle ID**: space.manus.raju-ai-agent.t[timestamp]

## Installation on Device

### Option 1: Direct APK Installation
1. Transfer APK to Android device
2. Enable "Unknown Sources" in Settings > Security
3. Open file manager and tap APK to install
4. Grant permissions when prompted

### Option 2: Using adb
```bash
adb install -r raju-ai-agent-release.apk
```

### Option 3: Expo Go (Development)
```bash
expo start --android
# Scan QR code with Expo Go app
```

## First Launch Checklist

- [ ] App launches without crashes
- [ ] Bottom tab navigation works (Home, Models, Thoughts, Memory, Settings)
- [ ] Home screen displays chat interface
- [ ] Models screen shows download form
- [ ] Settings screen displays API key inputs
- [ ] Thoughts screen shows reasoning visualization
- [ ] Memory screen displays experience browser
- [ ] Dark mode theme applied correctly
- [ ] All icons display properly

## Testing Scenarios

### Offline Mode Test
1. Go to Settings, toggle Cloud Mode OFF
2. Go to Models, paste GGUF URL (e.g., Mistral 7B)
3. Download and verify model
4. Go to Home, send test message
5. Verify response in Thoughts tab

### Cloud Mode Test
1. Go to Settings, enter OpenAI API key
2. Test connection (should show "Valid")
3. Toggle Cloud Mode ON
4. Go to Home, send test message
5. Verify response and reasoning

### Memory Test
1. Execute several tasks in Home screen
2. Go to Memory tab
3. Verify experiences are stored
4. Search for specific experiences
5. View experience details

## Troubleshooting

### Build Fails
- Clear cache: `pnpm store prune`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check gradle.properties: `cat android/gradle.properties`

### APK Installation Fails
- Ensure Android 10+ (API 29+)
- Uninstall previous version first
- Check available storage (need ~100MB)
- Enable "Unknown Sources" in Security settings

### App Crashes on Launch
- Check console: `adb logcat | grep raju-ai`
- Verify all permissions granted
- Clear app cache: Settings > Apps > Raju-ai > Storage > Clear Cache
- Reinstall app

### Model Download Fails
- Verify internet connection
- Check URL is direct .gguf link (not HTML page)
- Ensure sufficient device storage
- Check file size doesn't exceed available space

## Distribution

### APK Distribution Methods

1. **Direct Download**:
   - Host APK on web server
   - Share download link with users
   - Users download and install manually

2. **Google Play Store**:
   - Create Google Play Developer account
   - Sign APK with release key
   - Upload to Play Store
   - Follow app review process

3. **GitHub Releases**:
   - Upload APK to GitHub repository
   - Create release notes
   - Share release link

## Release Checklist

- [ ] APK size verified (<50MB)
- [ ] All features tested on device
- [ ] No console errors or crashes
- [ ] Permissions working correctly
- [ ] Offline mode functional
- [ ] Cloud mode functional
- [ ] Memory persistence working
- [ ] Thought stream visualization working
- [ ] UI responsive and polished
- [ ] Documentation complete

## Version Management

Current Version: 1.0.0

To update version:
1. Edit `app.config.ts`: change `version: "1.0.0"` to new version
2. Rebuild APK with new version
3. Update release notes
4. Distribute new APK

## Support

For build issues or questions, refer to:
- Expo Documentation: https://docs.expo.dev
- React Native Docs: https://reactnative.dev
- EAS Build: https://docs.expo.dev/build/introduction/

---

**Ready to build? Run: `eas build --platform android --type apk`**
