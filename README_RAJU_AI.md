# Raju-ai- Hybrid AI Agent for Android

A high-performance, autonomous AI agent for Android that supports both local GGUF models for offline use and external Cloud APIs for advanced reasoning, all linked by persistent vector memory.

## 🎯 Core Features

### 1. Smart Model Manager & Health Check
- **Lightweight APK**: <50MB initial size (models downloaded separately)
- **Custom GGUF Downloader**: Paste any direct .gguf download URL
- **Integrity Verification**: Automatic file-size and checksum validation
- **Storage Check**: Verifies available device storage before download
- **Auto-Cleanup**: Corrupts files are automatically deleted with user notification

### 2. Secure API Vault (Hybrid Mode)
- **Developer Settings Screen**: Securely store API keys for:
  - OpenAI
  - Anthropic
  - Gemini
- **Device-Level Encryption**: Uses `expo-secure-store` for key encryption
- **Seamless Mode Toggle**: Switch between Offline (Local) and Cloud (API) modes
- **Connection Testing**: Verify API keys before use

### 3. Autonomous Intelligence & Memory
- **Vector Memory**: Local SQLite-vec database stores every task as an "Experience"
- **Learning System**: Agent learns and never repeats mistakes
- **Reasoning Loop**: Plan → Execute → Reflect cycle for every task
- **Tool-Use**: Access to File System and System Clipboard

### 4. Technical Stack
- **Framework**: Expo 54 + React Native 0.81
- **Local Inference**: llama.rn (v0.1.3) for GGUF execution
- **Memory**: SQLite-vec for vector storage
- **Security**: expo-secure-store for encrypted key storage
- **UI**: Professional Dark Mode with Thought Stream visualization
- **Build**: Configured gradle.properties with 4GB JVM memory

## 📱 Screen Navigation

| Screen | Purpose | Icon |
|--------|---------|------|
| **Home** | Chat interface with agent status | 🏠 |
| **Models** | Download and manage GGUF models | 📦 |
| **Thoughts** | Real-time reasoning visualization | 💡 |
| **Memory** | Search and view stored experiences | 🧠 |
| **Settings** | API key vault and mode configuration | ⚙️ |

## 🚀 Quick Start

### Installation
1. Download the APK file
2. Install on Android device (Android 10+)
3. Grant necessary permissions (storage, clipboard)

### First Run
1. **Choose Mode**:
   - **Offline**: Use local GGUF models
   - **Cloud**: Use cloud APIs (requires API keys)

2. **For Offline Mode**:
   - Go to Models tab
   - Paste GGUF download URL
   - Wait for download and verification
   - Model will be ready for use

3. **For Cloud Mode**:
   - Go to Settings tab
   - Enter API keys for desired provider
   - Test connection
   - Toggle Cloud Mode ON

### Using the Agent
1. Type your task in the Home screen
2. Watch real-time reasoning in Thoughts tab
3. View stored experiences in Memory tab
4. Agent learns from each interaction

## 🔧 Configuration

### Gradle Build Settings
```properties
org.gradle.jvmargs=-Xmx4g          # 4GB memory for compilation
org.gradle.parallel=true            # Parallel builds
org.gradle.caching=true             # Build caching
android.useAndroidX=true            # AndroidX support
```

### Supported GGUF Models
- Mistral 7B
- Llama 2 7B
- Phi 2
- Any GGUF-compatible model

### API Providers
- **OpenAI**: gpt-3.5-turbo, gpt-4
- **Anthropic**: Claude 3 family
- **Google Gemini**: Gemini Pro

## 💾 Data Storage

### Local Storage
- **Models**: `/data/data/space.manus.raju-ai-agent/models/`
- **Memory**: SQLite database with vector embeddings
- **Cache**: Temporary files auto-cleaned

### Encryption
- API keys: AES-256 via expo-secure-store
- Memory: Local SQLite (no cloud sync by default)

## 🧠 Autonomous Reasoning Loop

### Plan Phase
Agent analyzes the task and creates a plan:
- Break down complex tasks
- Identify required tools
- Estimate resource needs

### Execute Phase
Agent executes the plan:
- Use local model or cloud API
- Apply tool-use (file system, clipboard)
- Track execution metrics

### Reflect Phase
Agent evaluates and learns:
- Check if task succeeded
- Store experience in vector memory
- Adjust strategy for future tasks

## 📊 Memory & Learning

### Experience Storage
Each task creates an experience record:
```
{
  id: unique_id,
  taskDescription: "user's request",
  input: "processed input",
  output: "agent's response",
  mode: "offline|cloud",
  model: "model_name",
  success: true|false,
  reasoning: { phases: [...] },
  timestamp: ISO_8601
}
```

### Vector Search
- Search experiences by description
- Filter by mode, model, success rate
- View success rate statistics
- Clear old experiences to free storage

## 🔐 Security

### API Key Protection
- Keys stored in device-level encrypted storage
- Never transmitted to external servers
- Can be deleted anytime
- Test connection before use

### Privacy
- All processing can happen locally
- No cloud sync unless explicitly enabled
- Models stored on device
- Full offline capability

## 🐛 Troubleshooting

### Model Download Issues
1. Check internet connection
2. Verify URL is direct .gguf file link
3. Ensure sufficient storage (check before download)
4. Check file integrity after download

### API Connection Issues
1. Verify API key is correct
2. Test connection in Settings
3. Check internet connectivity
4. Ensure API quota not exceeded

### Performance Issues
1. Close other apps to free memory
2. Use smaller models for offline
3. Clear old experiences from Memory
4. Restart app if unresponsive

## 📝 Example Usage

### Offline Mode (Local Model)
```
User: "Summarize this text: [long text]"
Agent: 
  [PLAN] Load local model, tokenize input
  [EXECUTE] Run inference on device
  [REFLECT] Store experience, success=true
Output: "Summary: ..."
```

### Cloud Mode (API)
```
User: "Translate this to French: [text]"
Agent:
  [PLAN] Use OpenAI API, prepare prompt
  [EXECUTE] Call API, get response
  [REFLECT] Store experience, learn pattern
Output: "Translation: ..."
```

## 📦 APK Specifications

- **Size**: <50MB (without models)
- **Min Android**: 10 (API 29)
- **Target Android**: 14+ (API 34+)
- **Architecture**: arm64-v8a, armeabi-v7a
- **Permissions**: Storage, Clipboard, Internet

## 🎨 UI/UX Features

- **Dark Mode**: Professional Indigo/Cyan theme
- **Thought Stream**: Real-time reasoning visualization
- **Progress Tracking**: Download speed, ETA, percentage
- **Status Indicators**: Mode, model, connection status
- **Error Handling**: Clear error messages and recovery options

## 🔄 Future Enhancements

- Multi-language support
- Cloud memory sync (optional)
- Task scheduling
- Advanced analytics dashboard
- Custom model fine-tuning
- Voice input/output

## 📄 License

Proprietary - Raju-ai- Agent

## 🤝 Support

For issues or feature requests, contact the development team.

---

**Built with ❤️ using Expo, React Native, and cutting-edge AI technologies**
