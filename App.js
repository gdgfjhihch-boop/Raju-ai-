/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v8.1            ║
 * ║          STEP 3.1: n8n Style Dynamic API UI (Add & Detect)      ║
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
  tabActive: "#10B981", tabInactive: "#6B7280", openai: "#10A37F"
};

const MODEL_URL = "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q2_K.gguf";
const MODEL_FILE_NAME = "tinyllama-1.1b.gguf";
const SECURE_KEY = "raju_master_api_key";
const SECURE_PROVIDER = "raju_api_provider";
const CHAT_FILE_PATH = FileSystem.documentDirectory + "chat_history.json";

export default function App() {
  const [activeTab, setActiveTab] = useState("SETTINGS"); // Testing ke liye Settings open rakha hai
  const [useCloud, setUseCloud] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [apiProvider, setApiProvider] = useState("unknown");
  
  // 🟢 NAYA STATE: Box dikhana hai ya nahi?
  const [isAddingApi, setIsAddingApi] = useState(false); 
  
  const [llamaContext, setLlamaContext] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelExists, setModelExists] = useState(false);
  
  const [messages, setMessages] = useState([{ id: "1", role: "ai", text: "Namaste Raju Bhai! n8n style API Connector ready hai!" }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);

  const modelPath = FileSystem.documentDirectory + MODEL_FILE_NAME;

  useEffect(() => { checkModelExists(); loadApiConfig(); }, []);

  const checkModelExists = async () => { const info = await FileSystem.getInfoAsync(modelPath); setModelExists(info.exists); };
  
  const loadApiConfig = async () => { 
    const key = await SecureStore.getItemAsync(SECURE_KEY); 
    const provider = await SecureStore.getItemAsync(SECURE_PROVIDER);
    if (key) { setApiKey(key); setInputKey(key); setApiProvider(provider || "unknown"); } 
  };

  const saveApiKey = async () => {
    const keyToSave = inputKey.trim();
    let detectedProvider = "unknown";

    if (keyToSave.startsWith("AIza")) detectedProvider = "gemini";
    else if (keyToSave.startsWith("sk-")) detectedProvider = "openai";
    else if (keyToSave.startsWith("gsk_")) detectedProvider = "groq";

    if (detectedProvider === "unknown") {
      alert("Invalid API Key! Hum is format ko nahi pehchante.");
      return;
    }

    await SecureStore.setItemAsync(SECURE_KEY, keyToSave);
    await SecureStore.setItemAsync(SECURE_PROVIDER, detectedProvider);
    setApiKey(keyToSave);
    setApiProvider(detectedProvider);
    setIsAddingApi(false); // 🟢 Box band kardo
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 🟢 NAYA FUNCTION: API Hatane ke liye
  const disconnectApi = async () => {
    Alert.alert("Disconnect API?", "Kya aap current API connection hatana chahte hain?", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync(SECURE_KEY);
          await SecureStore.deleteItemAsync(SECURE_PROVIDER);
          setApiKey(""); setInputKey(""); setApiProvider("unknown"); setUseCloud(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);
    setInput(""); setIsThinking(true);

    let routeTo = "offline";
    if (useCloud) {
      if (/(password|pin|bank|account|secret|khazana|gupt|\b\d{4,}\b)/i.test(userText)) routeTo = "offline";
      else if (userText.split(' ').length >= 5 || /(batao|kya|kaise|code|essay|search)/i.test(userText)) routeTo = "cloud";
      else routeTo = "offline";
    }

    if (routeTo === "cloud") {
      if (!apiKey || apiProvider === "unknown") { 
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ API connection nahi hai. Settings mein add karein." }]); 
        setIsThinking(false); return; 
      }
      try {
        let aiResponseText = "";
        if (apiProvider === "gemini") {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${userText}\n(Respond briefly)` }] }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          aiResponseText = data.candidates[0].content.parts[0].text;
        } else if (apiProvider === "openai") {
          const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: userText }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          aiResponseText = data.choices[0].message.content;
        }
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: aiResponseText, mode: "cloud" }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `❌ API Error: ` + error.message }]); }
    } else {
      if (!isModelLoaded || !llamaContext) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Local Model not running." }]); setIsThinking(false); return; }
      try {
        const result = await llamaContext.completion({ prompt: `<|system|>\nYou are Raju AI.\n</s>\n<|user|>\n${userText}</s>\n<|assistant|>\n`, n_predict: 150 });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: result.text.trim(), mode: "offline" }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "❌ Offline Error: " + error.message }]); }
    }
    setIsThinking(false);
  };

  const getProviderColor = () => { if(apiProvider === 'gemini') return COLORS.cloud; if(apiProvider === 'openai') return COLORS.openai; return COLORS.textMuted; };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Raju AI</Text>
        <View style={styles.onlineStatus}>
          <View style={[styles.onlineDot, { backgroundColor: useCloud ? getProviderColor() : (isModelLoaded ? COLORS.primary : COLORS.warning) }]} />
          <Text style={styles.headerSubtitle}>{useCloud ? `☁️ Auto (${apiProvider.toUpperCase()})` : "🧠 Local Locked"}</Text>
        </View>
      </View>

      {/* CHAT TAB (Hidden for brevity, it is the same) */}
      {activeTab === "CHAT" && (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <Text style={{color: '#fff'}}>Chat Tab (Code already exists here)</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveTab('SETTINGS')}><Text style={{color: '#fff'}}>Go to Settings</Text></TouchableOpacity>
          </View>
      )}

      {/* ─── ⚙️ SETTINGS TAB: N8N STYLE API UI ─── */}
      {activeTab === "SETTINGS" && (
        <ScrollView style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>⚙️ Integrations</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔌 API Connections</Text>
            
            {/* 1. EMPTY STATE: Agar koi API nahi hai aur Add nahi kar rahe */}
            {apiProvider === "unknown" && !isAddingApi && (
              <TouchableOpacity 
                style={[styles.actionBtn, {backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.cloud, borderStyle: 'dashed'}]} 
                onPress={() => setIsAddingApi(true)}>
                <Text style={{color: COLORS.cloud, fontWeight: 'bold', fontSize: 16}}>➕ Add API Connection</Text>
              </TouchableOpacity>
            )}

            {/* 2. ADD STATE: Jab '+' button dabaya */}
            {isAddingApi && (
              <View style={{marginTop: 10, padding: 15, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border}}>
                <Text style={{color: COLORS.textMain, fontWeight: 'bold', marginBottom: 5}}>New Connection</Text>
                <Text style={{color: COLORS.textMuted, fontSize: 12, marginBottom: 15}}>Paste your key (Gemini, OpenAI). We will detect the provider automatically.</Text>
                
                <TextInput style={styles.keyInput} placeholder="sk-... or AIza..." placeholderTextColor={COLORS.textMuted} value={inputKey} onChangeText={setInputKey} secureTextEntry />
                
                <View style={{flexDirection: 'row', marginTop: 15, justifyContent: 'space-between'}}>
                    <TouchableOpacity onPress={() => setIsAddingApi(false)} style={{padding: 12}}>
                        <Text style={{color: COLORS.danger, fontWeight: 'bold'}}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.cloud, paddingHorizontal: 20}]} onPress={saveApiKey}>
                        <Text style={styles.actionBtnText}>Detect & Connect</Text>
                    </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 3. ACTIVE STATE: Jab API jud chuki ho (Alag Section ban gaya) */}
            {apiProvider !== "unknown" && !isAddingApi && (
              <View style={{backgroundColor: COLORS.background, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: getProviderColor()}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontSize: 24, marginRight: 10}}>{apiProvider === 'gemini' ? '🔵' : '🟢'}</Text>
                    <View>
                        <Text style={{color: getProviderColor(), fontWeight: 'bold', fontSize: 18}}>{apiProvider.toUpperCase()}</Text>
                        <Text style={{color: COLORS.textMuted, fontSize: 12}}>Status: Connected & Active</Text>
                    </View>
                </View>
                <TouchableOpacity style={{marginTop: 15, alignSelf: 'flex-start'}} onPress={disconnectApi}>
                  <Text style={{color: COLORS.danger, fontWeight: 'bold'}}>🗑️ Disconnect</Text>
                </TouchableOpacity>
              </View>
            )}

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
  root: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 15, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border }, headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: 'bold' }, onlineStatus: { flexDirection: 'row', alignItems: 'center' }, onlineDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, headerSubtitle: { color: COLORS.textMuted, fontSize: 12 }, screenPadding: { flex: 1, padding: 20 }, sectionTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: 'bold', marginBottom: 15 }, card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }, cardTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }, actionBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, keyInput: { backgroundColor: COLORS.background, color: COLORS.textMain, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 16 }, bottomNav: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { fontSize: 22, marginBottom: 4 }
});
                                                         
