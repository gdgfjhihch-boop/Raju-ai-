/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v2.0            ║
 * ║          Real AI Integrated + Model Downloader                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { initLlama } from "llama.rn"; // ASLI ENGINE IMPORTED!

const COLORS = {
  background: "#111827", surface: "#1F2937", primary: "#10B981",
  textMain: "#F9FAFB", textMuted: "#9CA3AF", bubbleAI: "#374151",
  border: "#374151", danger: "#EF4444", warning: "#F59E0B"
};

// Ek chhota aur fast AI model testing ke liye (TinyLlama 1.1B)
const MODEL_URL = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q2_K.gguf";
const MODEL_FILE_NAME = "tinyllama-1.1b.gguf";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorText: "" }; }
  static getDerivedStateFromError(error) { return { hasError: true, errorText: error.toString() }; }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: COLORS.danger, fontSize: 22, fontWeight: 'bold' }}>Oops! System Error.</Text>
          <Text style={{ color: COLORS.textMain, marginTop: 10 }}>{this.state.errorText}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [activeTab, setActiveTab] = useState("CHAT"); // 'CHAT' ya 'MODEL'
  
  // AI State
  const [llamaContext, setLlamaContext] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  // Download State
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [modelExists, setModelExists] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([{ id: "1", role: "ai", text: "Namaste! Main Raju AI hoon. Kripya pehle 'Model' tab mein jaakar AI Model download/load karein." }]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const modelPath = FileSystem.documentDirectory + MODEL_FILE_NAME;

  // App start hone par check karein ki model pehle se download hai ya nahi
  useEffect(() => {
    checkModelExists();
  }, []);

  const checkModelExists = async () => {
    const info = await FileSystem.getInfoAsync(modelPath);
    setModelExists(info.exists);
  };

  // ─── Model Download Logic ────────────────────────────────────────────────
  const downloadModel = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URL,
        modelPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );
      await downloadResumable.downloadAsync();
      setModelExists(true);
      alert("Model Download Pura Hua! Ab aap ise Load kar sakte hain.");
    } catch (e) {
      alert("Download Error: " + e.message);
    }
    setIsDownloading(false);
  };

  // ─── Load AI Model ───────────────────────────────────────────────────────
  const loadModel = async () => {
    try {
      setIsThinking(true);
      const context = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 1024, // Short context memory for speed
      });
      setLlamaContext(context);
      setIsModelLoaded(true);
      setActiveTab("CHAT");
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "AI Model Load ho gaya hai! Ab main asli jawab de sakta hoon. Boliye?" }]);
    } catch (e) {
      alert("Model Load Error: " + e.message);
    }
    setIsThinking(false);
  };

  // ─── Asli Chat Logic ─────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userText = input.trim();
    const newMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMsgId, role: "user", text: userText }]);
    setInput("");

    if (!isModelLoaded || !llamaContext) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "ai", text: "⚠️ Bhai, AI Model abhi load nahi hua hai. Upar 'Model' button par click karein." }]);
      return;
    }

    setIsThinking(true);
    try {
      // TinyLlama prompt format
      const prompt = `<|system|>\nYou are an AI assistant named Raju AI. You help the user.\n</s>\n<|user|>\n${userText}</s>\n<|assistant|>\n`;
      
      const result = await llamaContext.completion({
        prompt: prompt,
        n_predict: 150, // AI kitne words bolega
        stop: ["</s>", "<|user|>"]
      });

      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "ai", text: result.text.trim() }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "ai", text: "❌ Sochne mein error aayi: " + error.message }]);
    }
    setIsThinking(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      {/* ─── Header & Tabs ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Raju AI</Text>
          <View style={styles.onlineStatus}>
            <View style={[styles.onlineDot, { backgroundColor: isModelLoaded ? COLORS.primary : COLORS.warning }]} />
            <Text style={styles.headerSubtitle}>{isModelLoaded ? "Asli AI Online" : "AI Offline"}</Text>
          </View>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab("CHAT")} style={[styles.tabBtn, activeTab === "CHAT" && styles.tabBtnActive]}>
            <Text style={[styles.tabText, activeTab === "CHAT" && styles.tabTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("MODEL")} style={[styles.tabBtn, activeTab === "MODEL" && styles.tabBtnActive]}>
            <Text style={[styles.tabText, activeTab === "MODEL" && styles.tabTextActive]}>Model</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MODEL DOWNLOAD SCREEN ─── */}
      {activeTab === "MODEL" && (
        <View style={styles.modelScreen}>
          <Text style={styles.modelTitle}>AI Model Khazana</Text>
          <Text style={styles.modelDesc}>Raju AI ko offline chalane ke liye ek dimaag (GGUF Model) ki zaroorat hai.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>TinyLlama (Fast Test Model)</Text>
            <Text style={styles.cardSize}>Size: ~480 MB</Text>
            
            {!modelExists ? (
              <TouchableOpacity style={styles.actionBtn} onPress={downloadModel} disabled={isDownloading}>
                <Text style={styles.actionBtnText}>{isDownloading ? "Downloading..." : "1. Download Model"}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.successText}>✓ Model Downloaded!</Text>
            )}

            {isDownloading && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
                <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
              </View>
            )}

            {modelExists && !isModelLoaded && (
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.warning, marginTop: 15}]} onPress={loadModel} disabled={isThinking}>
                <Text style={styles.actionBtnText}>{isThinking ? "Loading Engine..." : "2. Load AI Engine"}</Text>
              </TouchableOpacity>
            )}

            {isModelLoaded && (
              <Text style={[styles.successText, {marginTop: 15, color: COLORS.primary}]}>🚀 AI Engine Running!</Text>
            )}
          </View>
        </View>
      )}

      {/* ─── CHAT SCREEN ─── */}
      {activeTab === "CHAT" && (
        <View style={styles.chatContainer}>
          <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.chatScrollArea}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.messageRowUser : styles.messageRowAI]}>
                <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              </View>
            ))}
            {isThinking && (
              <View style={[styles.messageRow, styles.messageRowAI]}>
                <View style={[styles.bubble, styles.bubbleAI]}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                </View>
              </View>
            )}
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.textInput} 
                placeholder="Apna aadesh likhiye..." 
                placeholderTextColor={COLORS.textMuted} 
                value={input} 
                onChangeText={setInput} 
                multiline={true}
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isThinking}>
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

// ─── STYLES ───
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 15, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: 'bold' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 12 },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 20, padding: 4 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold' },
  tabTextActive: { color: COLORS.background },
  
  // Model Screen
  modelScreen: { flex: 1, padding: 20 },
  modelTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  modelDesc: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20 },
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  cardSize: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20 },
  actionBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  successText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  progressContainer: { marginTop: 15 },
  progressBar: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  progressText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 },

  // Chat Screen
  chatContainer: { flex: 1 },
  chatScrollArea: { padding: 15, paddingBottom: 20 },
  messageRow: { marginBottom: 15, flexDirection: 'row' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: COLORS.bubbleAI, borderBottomLeftRadius: 4 },
  messageText: { color: COLORS.textMain, fontSize: 16, lineHeight: 22 },
  
  // Input
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.surface, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.border },
  textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: 16, minHeight: 48, maxHeight: 120, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  sendButton: { backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { color: COLORS.background, fontSize: 20, marginLeft: 2 }
});
         
