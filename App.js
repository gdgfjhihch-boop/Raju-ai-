/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v6.0            ║
 * ║          STEP 1: 4 Rooms UI & 100% API Privacy (No Leak)        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, Switch, Alert
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { initLlama } from "llama.rn";

const COLORS = {
  background: "#111827", surface: "#1F2937", primary: "#10B981",
  textMain: "#F9FAFB", textMuted: "#9CA3AF", bubbleAI: "#374151",
  border: "#374151", danger: "#EF4444", warning: "#F59E0B", cloud: "#3B82F6",
  tabActive: "#10B981", tabInactive: "#6B7280"
};

const MODEL_URL = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q2_K.gguf";
const MODEL_FILE_NAME = "tinyllama-1.1b.gguf";
const SECURE_KEY = "raju_gemini_api_key";
const CHAT_FILE_PATH = FileSystem.documentDirectory + "chat_history.json";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorText: "" }; }
  static getDerivedStateFromError(error) { return { hasError: true, errorText: error.toString() }; }
  render() {
    if (this.state.hasError) return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, padding: 20, justifyContent: 'center' }}>
        <Text style={{ color: COLORS.danger, fontSize: 22, fontWeight: 'bold' }}>Oops! System Error.</Text>
        <Text style={{ color: COLORS.textMain, marginTop: 10 }}>{this.state.errorText}</Text>
      </SafeAreaView>
    );
    return this.props.children;
  }
}

function MainApp() {
  const [activeTab, setActiveTab] = useState("CHAT"); // CHAT, SKILLS, VAULT, SETTINGS
  
  const [useCloud, setUseCloud] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  
  const [llamaContext, setLlamaContext] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelExists, setModelExists] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const [messages, setMessages] = useState([{ id: "1", role: "ai", text: "Namaste Raju Bhai! 4 Kamron wala naya killa taiyar hai. Privacy 100% lock hai." }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);

  const modelPath = FileSystem.documentDirectory + MODEL_FILE_NAME;

  useEffect(() => {
    checkModelExists();
    loadApiKey();
    loadChatHistory();
  }, []);

  useEffect(() => {
    const saveChatHistory = async () => {
      try { if (messages.length > 1) await FileSystem.writeAsStringAsync(CHAT_FILE_PATH, JSON.stringify(messages)); } 
      catch (e) { console.log("Memory save error", e); }
    };
    saveChatHistory();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const info = await FileSystem.getInfoAsync(CHAT_FILE_PATH);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(CHAT_FILE_PATH);
        const savedMessages = JSON.parse(content);
        if (savedMessages && savedMessages.length > 0) setMessages(savedMessages);
      }
    } catch (e) { console.log("Memory load error", e); }
  };

  const clearMemory = async () => {
    Alert.alert("Clear Khazana?", "Puraani chat history delete ho jayegi.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await FileSystem.deleteAsync(CHAT_FILE_PATH, { idempotent: true });
          setMessages([{ id: Date.now().toString(), role: "ai", text: "Memory Erased! Nayi shuruwat." }]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
    ]);
  };

  const checkModelExists = async () => { const info = await FileSystem.getInfoAsync(modelPath); setModelExists(info.exists); };
  const loadApiKey = async () => { const key = await SecureStore.getItemAsync(SECURE_KEY); if (key) { setApiKey(key); setInputKey(key); } };
  const saveApiKey = async () => { await SecureStore.setItemAsync(SECURE_KEY, inputKey.trim()); setApiKey(inputKey.trim()); alert("API Key Saved!"); };

  const downloadModel = async () => {
    setIsDownloading(true); setDownloadProgress(0);
    try {
      const downloadResumable = FileSystem.createDownloadResumable(MODEL_URL, modelPath, {}, (progress) => setDownloadProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite));
      await downloadResumable.downloadAsync();
      setModelExists(true); alert("Model Downloaded!");
    } catch (e) { alert("Download Error"); }
    setIsDownloading(false);
  };

  const loadModel = async () => {
    try {
      setIsThinking(true);
      const context = await initLlama({ model: modelPath, use_mlock: true, n_ctx: 1024 });
      setLlamaContext(context); setIsModelLoaded(true); setActiveTab("CHAT"); setUseCloud(false);
    } catch (e) { alert("Load Error: " + e.message); }
    setIsThinking(false);
  };

  // ─── 🛡️ STEP 1: PRIVACY FIRST CHAT LOGIC ───
  const sendMessage = async () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userText = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);
    setInput(""); setIsThinking(true);

    if (useCloud) {
      if (!apiKey) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ API Key missing. Settings mein daalein." }]); setIsThinking(false); return; }
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        // 🛑 PRIVACY LOCK: No history sent. Only the current single prompt.
        const safePrompt = `${userText}\n(Respond naturally in Hindi/Hinglish)`;
        
        const response = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: safePrompt }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: data.candidates[0].content.parts[0].text, mode: "cloud" }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "❌ Cloud Error: " + error.message }]); }
    } else {
      if (!isModelLoaded || !llamaContext) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Offline Model is not running. Go to Settings." }]); setIsThinking(false); return; }
      try {
        const prompt = `<|system|>\nYou are Raju AI. Keep answers brief.\n</s>\n<|user|>\n${userText}</s>\n<|assistant|>\n`;
        const result = await llamaContext.completion({ prompt: prompt, n_predict: 150, stop: ["</s>", "<|user|>"] });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: result.text.trim(), mode: "offline" }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "❌ Offline Error: " + error.message }]); }
    }
    setIsThinking(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      {/* ─── Top Header ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Raju AI</Text>
        <View style={styles.onlineStatus}>
          <View style={[styles.onlineDot, { backgroundColor: useCloud ? COLORS.cloud : (isModelLoaded ? COLORS.primary : COLORS.warning) }]} />
          <Text style={styles.headerSubtitle}>{useCloud ? "☁️ Cloud Mode" : (isModelLoaded ? "🧠 Offline Mode" : "⚠️ Offline")}</Text>
        </View>
      </View>

      {/* ─── ROOM 1: CHAT ─── */}
      {activeTab === "CHAT" && (
        <View style={styles.screenContainer}>
          <View style={styles.switchContainer}>
            <Text style={{color: useCloud ? COLORS.textMuted : COLORS.primary, fontWeight: 'bold'}}>🧠 Offline (Secure)</Text>
            <Switch value={useCloud} onValueChange={setUseCloud} trackColor={{ false: COLORS.border, true: COLORS.cloud }} thumbColor={"#fff"} />
            <Text style={{color: useCloud ? COLORS.cloud : COLORS.textMuted, fontWeight: 'bold'}}>☁️ Online (API)</Text>
          </View>
          <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd()} contentContainerStyle={styles.chatScrollArea}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.messageRowUser : styles.messageRowAI]}>
                <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                  {msg.role === "ai" && msg.mode && <Text style={{fontSize: 10, color: msg.mode === 'cloud' ? COLORS.cloud : COLORS.primary, marginBottom: 4}}>{msg.mode === 'cloud' ? "☁️ API" : "🧠 Local"}</Text>}
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              </View>
            ))}
            {isThinking && <ActivityIndicator color={useCloud ? COLORS.cloud : COLORS.primary} style={{alignSelf: 'flex-start', marginLeft: 10}} />}
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Type message..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} multiline />
              <TouchableOpacity style={[styles.sendButton, {backgroundColor: useCloud ? COLORS.cloud : COLORS.primary}]} onPress={sendMessage} disabled={isThinking}>
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ─── ROOM 2: SKILLS (Under Construction) ─── */}
      {activeTab === "SKILLS" && (
        <View style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>🧠 Skills Library</Text>
          <Text style={styles.descText}>Yahan Raju AI ki seekhi hui nayi skills aayengi (e.g. Stock Expert, Coder).</Text>
          <View style={[styles.card, {alignItems: 'center', marginTop: 50, borderStyle: 'dashed'}]}>
            <Text style={{fontSize: 40}}>🚧</Text>
            <Text style={[styles.cardTitle, {marginTop: 10}]}>Under Construction</Text>
            <Text style={{color: COLORS.textMuted, textAlign: 'center'}}>Step 5 mein hum yahan Auto-Skill generator lagayenge.</Text>
          </View>
        </View>
      )}

      {/* ─── ROOM 3: KHAZANA (Under Construction) ─── */}
      {activeTab === "VAULT" && (
        <View style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>📁 Mera Khazana</Text>
          <Text style={styles.descText}>Aapka 100% private aur secure vault.</Text>
          <View style={[styles.card, {alignItems: 'center', marginTop: 50, borderColor: COLORS.warning}]}>
            <Text style={{fontSize: 40}}>🔒</Text>
            <Text style={[styles.cardTitle, {color: COLORS.warning, marginTop: 10}]}>Biometric Lock Required</Text>
            <Text style={{color: COLORS.textMuted, textAlign: 'center'}}>Step 6 mein yahan Fingerprint lock aur private files ka system aayega.</Text>
          </View>
        </View>
      )}

      {/* ─── ROOM 4: SETTINGS & MODEL ─── */}
      {activeTab === "SETTINGS" && (
        <ScrollView style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>⚙️ Master Settings</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔑 API Vault</Text>
            <Text style={{color: COLORS.textMuted, marginBottom: 5}}>Google Gemini Key:</Text>
            <TextInput style={styles.keyInput} placeholder="AIzaSyB..." placeholderTextColor={COLORS.textMuted} value={inputKey} onChangeText={setInputKey} secureTextEntry />
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.cloud, marginTop: 10}]} onPress={saveApiKey}><Text style={styles.actionBtnText}>Save Key</Text></TouchableOpacity>
          </View>

          <View style={[styles.card, {marginTop: 20}]}>
            <Text style={styles.cardTitle}>🧠 Local Engine (TinyLlama)</Text>
            {!modelExists ? (
              <TouchableOpacity style={styles.actionBtn} onPress={downloadModel} disabled={isDownloading}>
                <Text style={styles.actionBtnText}>{isDownloading ? `Downloading... ${Math.round(downloadProgress * 100)}%` : "Download Model (480MB)"}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.successText}>✓ Model Saved on Device</Text>
                {!isModelLoaded && (
                  <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.warning, marginTop: 10}]} onPress={loadModel} disabled={isThinking}>
                    <Text style={styles.actionBtnText}>{isThinking ? "Starting Engine..." : "Start Offline AI"}</Text>
                  </TouchableOpacity>
                )}
                {isModelLoaded && <Text style={[styles.successText, {marginTop: 10}]}>Engine is Running! 🟢</Text>}
              </>
            )}
          </View>

          <View style={[styles.card, {marginTop: 20, borderColor: COLORS.danger, marginBottom: 40}]}>
            <Text style={{color: COLORS.danger, fontSize: 16, fontWeight: 'bold', marginBottom: 5}}>Danger Zone</Text>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.danger}]} onPress={clearMemory}><Text style={styles.actionBtnText}>🗑️ Erase Chat History</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ─── BOTTOM NAVIGATION BAR ─── */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("CHAT")}>
          <Text style={styles.navIcon}>{activeTab === "CHAT" ? "💬" : "🗨️"}</Text>
          <Text style={[styles.navText, activeTab === "CHAT" && styles.navTextActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("SKILLS")}>
          <Text style={styles.navIcon}>🧠</Text>
          <Text style={[styles.navText, activeTab === "SKILLS" && styles.navTextActive]}>Skills</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("VAULT")}>
          <Text style={styles.navIcon}>📁</Text>
          <Text style={[styles.navText, activeTab === "VAULT" && styles.navTextActive]}>Khazana</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("SETTINGS")}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={[styles.navText, activeTab === "SETTINGS" && styles.navTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 15, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: 'bold' },
  onlineStatus: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 12 },
  
  screenContainer: { flex: 1 },
  screenPadding: { flex: 1, padding: 20 },
  sectionTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  descText: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20 },
  
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  actionBtn: { padding: 15, borderRadius: 8, alignItems: 'center', backgroundColor: COLORS.primary },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  successText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  keyInput: { backgroundColor: COLORS.background, color: COLORS.textMain, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 16 },
  
  switchContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border, gap: 10 },
  chatScrollArea: { padding: 15, paddingBottom: 20 },
  messageRow: { marginBottom: 15, flexDirection: 'row' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 16 },
  bubbleUser: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: 'transparent', borderBottomLeftRadius: 4 },
  messageText: { color: COLORS.textMain, fontSize: 16, lineHeight: 22 },
  
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.surface, alignItems: 'flex-end', borderTopWidth: 1, borderColor: COLORS.border },
  textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: 16, minHeight: 48, maxHeight: 120, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  sendButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { color: COLORS.textMain, fontSize: 20, marginLeft: 2 },

  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { fontSize: 22, marginBottom: 4 },
  navText: { fontSize: 10, color: COLORS.tabInactive, fontWeight: 'bold' },
  navTextActive: { color: COLORS.tabActive }
});
    
