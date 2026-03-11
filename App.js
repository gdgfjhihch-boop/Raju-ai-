/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v8.3            ║
 * ║          STEP 1: Multi-API Connections (n8n Style Vault)        ║
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
  tabActive: "#10B981", tabInactive: "#6B7280", openai: "#10A37F", tool: "#8B5CF6"
};

const MODEL_URL = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q2_K.gguf";
const MODEL_FILE_NAME = "tinyllama-1.1b.gguf";
const SECURE_CONNECTIONS = "raju_api_connections"; // Naya storage array ke liye
const SECURE_ACTIVE_ENGINE = "raju_active_engine";

export default function App() {
  const [activeTab, setActiveTab] = useState("SETTINGS"); 
  const [useCloud, setUseCloud] = useState(false);
  
  // 🟢 Multi-API States
  const [connections, setConnections] = useState([]); // Sabhi APIs ki list
  const [activeEngineId, setActiveEngineId] = useState(null); // Kaunsa dimaag chal raha hai
  
  const [inputKey, setInputKey] = useState("");
  const [isAddingApi, setIsAddingApi] = useState(false); 
  
  const [llamaContext, setLlamaContext] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelExists, setModelExists] = useState(false);
  
  const [messages, setMessages] = useState([{ id: "1", role: "ai", text: "Namaste Raju Bhai! Multi-API Vault ready hai. Aap ek se zyada APIs add kar sakte hain." }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);

  const modelPath = FileSystem.documentDirectory + MODEL_FILE_NAME;

  useEffect(() => { checkModelExists(); loadConnections(); }, []);

  const checkModelExists = async () => { const info = await FileSystem.getInfoAsync(modelPath); setModelExists(info.exists); };
  
  // ─── 🔑 LOAD MULTIPLE APIS ───
  const loadConnections = async () => { 
    try {
      const savedConns = await SecureStore.getItemAsync(SECURE_CONNECTIONS);
      const savedActive = await SecureStore.getItemAsync(SECURE_ACTIVE_ENGINE);
      if (savedConns) { setConnections(JSON.parse(savedConns)); }
      if (savedActive) { setActiveEngineId(savedActive); }
    } catch(e) { console.log("Failed to load connections"); }
  };

  // ─── ➕ ADD NEW API (Auto-Detect Logic) ───
  const saveNewConnection = async () => {
    const keyToSave = inputKey.trim();
    if(!keyToSave) return;

    let provider = "unknown";
    let type = "engine"; // Ya toh dimaag (engine) hoga, ya hathiyar (tool)
    let color = COLORS.textMuted;

    // 🕵️ Auto-Detect
    if (keyToSave.startsWith("AIza")) { provider = "Gemini"; color = COLORS.cloud; }
    else if (keyToSave.startsWith("sk-")) { provider = "OpenAI"; color = COLORS.openai; }
    else if (keyToSave.startsWith("gsk_")) { provider = "Groq"; color = COLORS.primary; }
    else if (keyToSave.startsWith("tvly-")) { provider = "Tavily Search"; type = "tool"; color = COLORS.tool; } // 🟢 Tavily added!

    if (provider === "unknown") {
      alert("Unknown API Key format!"); return;
    }

    const newConn = { id: Date.now().toString(), provider, key: keyToSave, type, color };
    const updatedConns = [...connections, newConn];
    
    await SecureStore.setItemAsync(SECURE_CONNECTIONS, JSON.stringify(updatedConns));
    setConnections(updatedConns);
    
    // Agar pehla engine add kiya hai, toh use automatically Active kar do
    if (type === "engine" && !activeEngineId) {
       setActiveEngineId(newConn.id);
       await SecureStore.setItemAsync(SECURE_ACTIVE_ENGINE, newConn.id);
    }

    setInputKey(""); setIsAddingApi(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ─── 🗑️ DELETE API ───
  const deleteConnection = async (id) => {
    Alert.alert("Delete Connection?", "Ye API key hat jayegi.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const updated = connections.filter(c => c.id !== id);
          await SecureStore.setItemAsync(SECURE_CONNECTIONS, JSON.stringify(updated));
          setConnections(updated);
          if (activeEngineId === id) { setActiveEngineId(null); await SecureStore.deleteItemAsync(SECURE_ACTIVE_ENGINE); }
      }}
    ]);
  };

  // ─── ✅ SET ACTIVE ENGINE ───
  const makeActiveEngine = async (id) => {
    setActiveEngineId(id);
    await SecureStore.setItemAsync(SECURE_ACTIVE_ENGINE, id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─── 🧠 MOCK CHAT ROUTER (For UI Testing) ───
  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: input.trim() }]);
    setInput(""); setIsThinking(true);
    
    setTimeout(() => {
        let activeConn = connections.find(c => c.id === activeEngineId);
        let resp = useCloud 
            ? (activeConn ? `☁️ ${activeConn.provider} Engine responding...` : "⚠️ Koi Active Cloud Engine nahi hai!") 
            : "🧠 Offline Llama Engine responding...";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: resp }]);
        setIsThinking(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Raju AI</Text>
        <View style={styles.onlineStatus}>
          <View style={[styles.onlineDot, { backgroundColor: useCloud ? COLORS.cloud : COLORS.warning }]} />
          <Text style={styles.headerSubtitle}>{useCloud ? `☁️ Cloud Mode` : "🧠 Local Locked"}</Text>
        </View>
      </View>

      {/* 💬 CHAT TAB */}
      {activeTab === "CHAT" && (
        <View style={styles.screenContainer}>
          <View style={styles.switchContainer}>
            <Text style={{color: useCloud ? COLORS.textMuted : COLORS.primary, fontWeight: 'bold'}}>🧠 Local</Text>
            <Switch value={useCloud} onValueChange={setUseCloud} trackColor={{ false: COLORS.border, true: COLORS.cloud }} thumbColor={"#fff"} />
            <Text style={{color: useCloud ? COLORS.cloud : COLORS.textMuted, fontWeight: 'bold'}}>☁️ API</Text>
          </View>
          <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd()} contentContainerStyle={styles.chatScrollArea}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.messageRowUser : styles.messageRowAI]}>
                <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              </View>
            ))}
            {isThinking && <ActivityIndicator color={COLORS.primary} style={{alignSelf: 'flex-start', marginLeft: 10}} />}
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Ask anything..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} multiline />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isThinking}><Text style={styles.sendIcon}>➤</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ⚙️ SETTINGS TAB: MULTI-API VAULT */}
      {activeTab === "SETTINGS" && (
        <ScrollView style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>⚙️ Integrations Vault</Text>
          
          <View style={styles.card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={styles.cardTitle}>🔌 Connected APIs</Text>
                {/* ➕ PLUS BUTTON */}
                <TouchableOpacity onPress={() => setIsAddingApi(!isAddingApi)}>
                    <Text style={{color: COLORS.cloud, fontSize: 24, fontWeight: 'bold'}}>{isAddingApi ? "✖" : "➕"}</Text>
                </TouchableOpacity>
            </View>

            {/* ADD NEW API BOX */}
            {isAddingApi && (
              <View style={{marginBottom: 20, padding: 15, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cloud}}>
                <Text style={{color: COLORS.textMain, fontWeight: 'bold', marginBottom: 5}}>Add Engine or Tool</Text>
                <Text style={{color: COLORS.textMuted, fontSize: 12, marginBottom: 10}}>Paste Gemini, OpenAI, or Tavily key.</Text>
                <TextInput style={styles.keyInput} placeholder="sk-..., AIza..., tvly-..." placeholderTextColor={COLORS.textMuted} value={inputKey} onChangeText={setInputKey} secureTextEntry />
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.cloud, marginTop: 10}]} onPress={saveNewConnection}>
                    <Text style={styles.actionBtnText}>Save Connection</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ENGINES LIST */}
            <Text style={{color: COLORS.textMuted, fontWeight: 'bold', marginBottom: 10, marginTop: 10}}>🧠 AI ENGINES (Brains)</Text>
            {connections.filter(c => c.type === 'engine').length === 0 && <Text style={{color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 10}}>No engines added yet.</Text>}
            
            {connections.filter(c => c.type === 'engine').map((conn) => (
                <View key={conn.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: activeEngineId === conn.id ? conn.color : COLORS.border}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <TouchableOpacity onPress={() => makeActiveEngine(conn.id)} style={{marginRight: 10}}>
                            <View style={{width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: conn.color, justifyContent: 'center', alignItems: 'center'}}>
                                {activeEngineId === conn.id && <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: conn.color}} />}
                            </View>
                        </TouchableOpacity>
                        <Text style={{color: COLORS.textMain, fontWeight: 'bold'}}>{conn.provider}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteConnection(conn.id)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                </View>
            ))}

            {/* TOOLS LIST */}
            <Text style={{color: COLORS.textMuted, fontWeight: 'bold', marginBottom: 10, marginTop: 15}}>🛠️ AI TOOLS (Skills)</Text>
            {connections.filter(c => c.type === 'tool').length === 0 && <Text style={{color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 10}}>No tools added yet.</Text>}
            
            {connections.filter(c => c.type === 'tool').map((conn) => (
                <View key={conn.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: conn.color}}>
                    <Text style={{color: COLORS.textMain, fontWeight: 'bold'}}>🔎 {conn.provider}</Text>
                    <TouchableOpacity onPress={() => deleteConnection(conn.id)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                </View>
            ))}

          </View>
        </ScrollView>
      )}

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("CHAT")}><Text style={styles.navIcon}>💬</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("SETTINGS")}><Text style={styles.navIcon}>⚙️</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 15, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border }, headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: 'bold' }, onlineStatus: { flexDirection: 'row', alignItems: 'center' }, onlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, headerSubtitle: { color: COLORS.textMuted, fontSize: 12 }, screenContainer: { flex: 1 }, screenPadding: { flex: 1, padding: 20 }, sectionTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: 'bold', marginBottom: 15 }, card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }, cardTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: 'bold' }, actionBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, keyInput: { backgroundColor: COLORS.background, color: COLORS.textMain, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 16 }, switchContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border, gap: 10 }, chatScrollArea: { padding: 15, paddingBottom: 20 }, messageRow: { marginBottom: 15, flexDirection: 'row' }, messageRowUser: { justifyContent: 'flex-end' }, messageRowAI: { justifyContent: 'flex-start' }, bubble: { maxWidth: '85%', padding: 14, borderRadius: 16 }, bubbleUser: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomRightRadius: 4 }, bubbleAI: { backgroundColor: 'transparent', borderBottomLeftRadius: 4 }, messageText: { color: COLORS.textMain, fontSize: 16, lineHeight: 22 }, inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.surface, alignItems: 'flex-end', borderTopWidth: 1, borderColor: COLORS.border }, textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: 16, minHeight: 48, maxHeight: 120, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border }, sendButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }, sendIcon: { color: COLORS.textMain, fontSize: 20, marginLeft: 2 }, bottomNav: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { fontSize: 22, marginBottom: 4 }
});
      
