# Raju-ai- Agent Design Document

## Vision
A high-performance, autonomous AI agent for Android that operates both offline (local GGUF models) and online (Cloud APIs) with persistent vector memory, enabling the agent to learn from every interaction and never repeat mistakes.

## Screen List

1. **Splash Screen** - App initialization with branding
2. **Home Screen** - Main agent interface with chat/task input
3. **Thought Stream** - Real-time visualization of agent's reasoning process (Plan → Execute → Reflect)
4. **Model Manager** - Download, verify, and manage local GGUF models
5. **Developer Settings** - Secure API key vault for OpenAI, Anthropic, Gemini
6. **Memory Browser** - View stored experiences and vector memory
7. **Task History** - View past tasks and agent decisions
8. **Settings** - General app configuration and preferences

## Primary Content and Functionality

### Home Screen
- **Chat/Input Area**: Text input for user tasks or queries
- **Agent Status**: Current mode (Offline/Cloud), active model name
- **Quick Actions**: Buttons for common tasks (Ask Question, Analyze File, Generate Content)
- **Recent Tasks**: Quick access to last 5 completed tasks
- **Mode Toggle**: Switch between Offline (Local GGUF) and Cloud (API) modes

### Thought Stream
- **Real-time Log**: Display agent's internal reasoning in real-time
- **Plan Phase**: Show what the agent is planning to do
- **Execute Phase**: Show actions being taken
- **Reflect Phase**: Show self-correction and learning
- **Expandable Details**: Tap to see full reasoning for each phase
- **Copy/Share**: Allow copying thought stream for debugging

### Model Manager
- **Model List**: Display downloaded GGUF models with file size, download date
- **Custom Download**: Input field for direct .gguf URL
- **Download Progress**: Real-time progress bar with speed and ETA
- **Health Check**: Display file size and checksum verification status
- **Storage Check**: Show available device storage before download
- **Delete Model**: Swipe to delete or tap delete button
- **Model Details**: Tap to see model info (size, format, downloaded date)

### Developer Settings
- **API Key Vault**: Secure input fields for:
  - OpenAI API Key
  - Anthropic API Key
  - Gemini API Key
- **Encryption Status**: Show that keys are encrypted with expo-secure-store
- **Mode Selection**: Toggle between Offline and Cloud modes
- **Test Connection**: Button to verify API keys are valid
- **Clear All Keys**: Destructive action to clear all stored keys

### Memory Browser
- **Vector Memory Stats**: Total experiences stored, memory size
- **Experience List**: Searchable list of stored experiences
- **Experience Details**: Tap to view full context of past experience
- **Memory Cleanup**: Option to archive old experiences
- **Export Memory**: Download memory database for backup

### Task History
- **Task List**: Chronological list of completed tasks
- **Task Details**: Tap to see full task, agent response, and reasoning
- **Retry Task**: Button to re-run a previous task
- **Success Rate**: Show success/failure metrics
- **Filter**: Filter by date, model used, or mode (Offline/Cloud)

## Key User Flows

### Flow 1: Ask Agent a Question (Offline Mode)
1. User opens Home Screen
2. User types question in input field
3. User taps "Send" button
4. Agent starts reasoning (Thought Stream shows Plan phase)
5. Local GGUF model processes query
6. Thought Stream shows Execute phase
7. Agent generates response
8. Thought Stream shows Reflect phase (self-check)
9. Response displayed on Home Screen
10. Experience stored in Vector Memory

### Flow 2: Download and Verify GGUF Model
1. User navigates to Model Manager
2. User taps "Add Model" button
3. User pastes direct .gguf download URL
4. App checks available storage
5. Download starts with progress bar
6. File integrity checked (size/checksum)
7. If corrupted: Auto-delete, show error notification
8. If valid: Model added to list, ready for use
9. User can select model as active for Offline mode

### Flow 3: Switch to Cloud Mode with API Key
1. User navigates to Developer Settings
2. User enters OpenAI API Key (encrypted with expo-secure-store)
3. User taps "Test Connection" to verify key
4. User toggles "Cloud Mode" on
5. User returns to Home Screen
6. Mode indicator shows "Cloud: OpenAI"
7. Next query uses OpenAI API instead of local model
8. Agent response includes cloud processing metadata

### Flow 4: Review Agent Reasoning
1. User asks agent a question
2. Thought Stream displays in real-time during processing
3. User can tap on any phase (Plan/Execute/Reflect) to expand
4. Full reasoning details shown
5. User can copy or share thought stream
6. Experience automatically saved to memory

## Color Choices

- **Primary Brand**: Deep Indigo (#2D3561) - represents AI/intelligence
- **Accent**: Neon Cyan (#00D9FF) - represents agent activity/energy
- **Background**: Near Black (#0F1419) - professional dark mode
- **Surface**: Dark Slate (#1A1F2E) - card/elevated surfaces
- **Success**: Emerald Green (#10B981) - successful operations
- **Warning**: Amber (#F59E0B) - alerts/cautions
- **Error**: Rose Red (#EF4444) - errors/failures
- **Text Primary**: Off White (#F3F4F6) - main text
- **Text Secondary**: Slate Gray (#9CA3AF) - secondary text
- **Border**: Deep Slate (#374151) - dividers/borders

## Technical Constraints

- **APK Size**: Must remain <50MB (no bundled models)
- **Offline Support**: GGUF models downloaded on-demand
- **Memory Persistence**: SQLite-vec for vector memory
- **Security**: expo-secure-store for API keys
- **Performance**: Responsive UI even during model inference
- **Orientation**: Portrait mode (9:16 aspect ratio)
- **One-Handed Usage**: All controls reachable from bottom half of screen
