/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v8.5            ║
 * ║          FULLY FUNCTIONAL: Vault + Khazana + Real API/Offline   ║
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
  openai: "#10A37F", tool: "#8B5CF6", folder: "#FBBF24"
};

const MODEL_FILE_NAME = "tinyllama-1.1b.gguf";
const SECURE_CONNECTIONS = "raju_api_connections"; 
const SECURE_ACTIVE_ENGINE = "raju_active_engine";
const KHAZANA_DIR = FileSystem.documentDirectory + "Raju_Khazana/";

export default function App() {
  const [activeTab, setActiveTab] = useState("CHAT"); 
  const [useCloud, setUseCloud] = useState(false);
  
  const [connections, setConnections] = useState([]); 
  const [activeEngineId, setActiveEngineId] = useState(null); 
  const [inputKey, setInputKey] = useState("");
  const [isAddingApi, setIsAddingApi] = useState(false); 
  
  const [llamaContext, setLlamaContext] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelExists, setModelExists] = useState(false);
  
  const [messages, setMessages] = useState([{ id: "1", role: "ai", text: "Namaste Raju Bhai! Ab sab kuch ASLI chal raha hai. API test kijiye ya Offline Start kijiye!" }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);

  const [khazanaItems, setKhazanaItems] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const modelPath = FileSystem.documentDirectory + MODEL_FILE_NAME;

  useEffect(() => { 
    checkModelExists();
    loadConnections(); 
    initKhazana(); 
  }, []);

  const checkModelExists = async () => { const info = await FileSystem.getInfoAsync(modelPath); setModelExists(info.exists); };

  // ─── 📁 KHAZANA (FILE MANAGER) LOGIC ───
  const initKhazana = async () => {
    const dirInfo = await FileSystem.getInfoAsync(KHAZANA_DIR);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(KHAZANA_DIR, { intermediates: true });
    loadKhazanaFiles();
  };

  const loadKhazanaFiles = async () => {
    try { const files = await FileSystem.readDirectoryAsync(KHAZANA_DIR); setKhazanaItems(files); } catch (e) { console.log(e); }
  };

  const createFolderManually = async () => {
    if(!newFolderName.trim()) return;
    await FileSystem.makeDirectoryAsync(KHAZANA_DIR + newFolderName.trim() + "/", { intermediates: true });
    setNewFolderName(""); loadKhazanaFiles(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteKhazanaItem = async (itemName) => {
    Alert.alert("Delete?", `${itemName} ko hamesha ke liye delete karein?`, [
      { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await FileSystem.deleteAsync(KHAZANA_DIR + itemName, { idempotent: true }); loadKhazanaFiles(); }}
    ]);
  };

  // ─── 🔑 API CONNECTIONS LOGIC ───
  const loadConnections = async () => { 
    try {
      const savedConns = await SecureStore.getItemAsync(SECURE_CONNECTIONS);
      const savedActive = await SecureStore.getItemAsync(SECURE_ACTIVE_ENGINE);
      if (savedConns) setConnections(JSON.parse(savedConns));
      if (savedActive) setActiveEngineId(savedActive);
    } catch(e) {}
  };

  const saveNewConnection = async () => {
    const keyToSave = inputKey.trim();
    if(!keyToSave) return;
    let provider = "unknown", type = "engine", color = COLORS.textMuted;
    if (keyToSave.startsWith("AIza")) { provider = "Gemini"; color = COLORS.cloud; }
    else if (keyToSave.startsWith("sk-")) { provider = "OpenAI"; color = COLORS.openai; }
    else if (keyToSave.startsWith("gsk_")) { provider = "Groq"; color = COLORS.primary; }
    else if (keyToSave.startsWith("tvly-")) { provider = "Tavily Search"; type = "tool"; color = COLORS.tool; } 
    if (provider === "unknown") { alert("Unknown API Key!"); return; }

    const newConn = { id: Date.now().toString(), provider, key: keyToSave, type, color };
    const updatedConns = [...connections, newConn];
    await SecureStore.setItemAsync(SECURE_CONNECTIONS, JSON.stringify(updatedConns));
    setConnections(updatedConns);
    if (type === "engine" && !activeEngineId) { setActiveEngineId(newConn.id); await SecureStore.setItemAsync(SECURE_ACTIVE_ENGINE, newConn.id); }
    setInputKey(""); setIsAddingApi(false);
  };

  const deleteConnection = async (id) => {
    const updated = connections.filter(c => c.id !== id);
    await SecureStore.setItemAsync(SECURE_CONNECTIONS, JSON.stringify(updated));
    setConnections(updated);
    if (activeEngineId === id) { setActiveEngineId(null); await SecureStore.deleteItemAsync(SECURE_ACTIVE_ENGINE); }
  };

  const makeActiveEngine = async (id) => {
    setActiveEngineId(id); await SecureStore.setItemAsync(SECURE_ACTIVE_ENGINE, id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─── 🧠 ASLI OFFLINE MODEL LOADER ───
  const loadOfflineModel = async () => {
    try { 
      setIsThinking(true); 
      const context = await initLlama({ model: modelPath, use_mlock: true, n_ctx: 1024 }); 
      setLlamaContext(context); setIsModelLoaded(true); setUseCloud(false); setActiveTab("CHAT");
    } catch (e) { alert("Load Error: " + e.message); }
    setIsThinking(false);
  };

  // ─── 💬 THE REAL CHAT ROUTER ───
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);
    setInput(""); setIsThinking(true);

    // 1. Agentic Khazana Intercept
    const lowerText = userText.toLowerCase();
    if (lowerText.startsWith("folder banao:")) {
      const folderName = userText.split(":")[1].trim();
      if(folderName) {
         await FileSystem.makeDirectoryAsync(KHAZANA_DIR + folderName + "/", { intermediates: true });
         loadKhazanaFiles();
         setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `📁 Done! Khazana mein '${folderName}' folder ban gaya.`, routerStatus: "🛠️ Local System" }]);
         setIsThinking(false); return;
      }
    }
    if (lowerText.startsWith("note likho:")) {
      const parts = userText.split("|");
      if(parts.length >= 2) {
         const fileName = parts[0].replace("note likho:", "").trim() + ".txt";
         await FileSystem.writeAsStringAsync(KHAZANA_DIR + fileName, parts[1].trim());
         loadKhazanaFiles();
         setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `📝 Done! '${fileName}' Khazana mein save ho gai.`, routerStatus: "🛠️ Local System" }]);
         setIsThinking(false); return;
      }
    }

    // 2. Cloud (API) Routing
    if (useCloud) {
      let activeConn = connections.find(c => c.id === activeEngineId);
      if (!activeConn) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Koi Active Engine select nahi kiya hai Settings mein." }]); setIsThinking(false); return; }
      
      try {
        let aiResponseText = "";
        if (activeConn.provider === "Gemini") {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${activeConn.key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${userText}\n(Respond briefly in Hindi)` }] }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          aiResponseText = data.candidates[0].content.parts[0].text;
        } else if (activeConn.provider === "OpenAI") {
          const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeConn.key}` }, body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: userText }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          aiResponseText = data.choices[0].message.content;
        } else { aiResponseText = "⚠️ Ye engine abhi chat ke liye configure nahi hai."; }
        
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: aiResponseText, routerStatus: `☁️ ${activeConn.provider}` }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `❌ API Error: ` + error.message }]); }
    } 
    // 3. Offline Llama Routing
    else {
      if (!isModelLoaded || !llamaContext) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Offline Model start nahi hua hai. Settings se start karein." }]); setIsThinking(false); return; }
      try {
        const result = await llamaContext.completion({ prompt: `<|system|>\nYou are Raju AI. Keep answers short.\n</s>\n<|user|>\n${userText}</s>\n<|assistant|>\n`, n_predict: 150 });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: result.text.trim(), routerStatus: "🧠 Offline Llama" }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "❌ Offline Error: " + error.message }]); }
    }
    setIsThinking(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Raju AI</Text>
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
                  {msg.role === "ai" && msg.routerStatus && <Text style={{fontSize: 10, color: COLORS.warning, marginBottom: 6, fontStyle: 'italic'}}>{msg.routerStatus}</Text>}
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              </View>
            ))}
            {isThinking && <ActivityIndicator color={useCloud ? COLORS.cloud : COLORS.primary} style={{alignSelf: 'flex-start', marginLeft: 10}} />}
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} placeholder="Ask anything or 'Folder banao: Name'" placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} multiline />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isThinking}><Text style={styles.sendIcon}>➤</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* 📁 KHAZANA TAB */}
      {activeTab === "KHAZANA" && (
        <ScrollView style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>📁 Mera Khazana</Text>
          <View style={[styles.card, {marginBottom: 20}]}>
             <Text style={styles.cardTitle}>➕ Create Manually</Text>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput style={[styles.keyInput, {flex: 1, marginRight: 10}]} placeholder="Folder Name..." placeholderTextColor={COLORS.textMuted} value={newFolderName} onChangeText={setNewFolderName} />
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.folder, paddingHorizontal: 15}]} onPress={createFolderManually}><Text style={{color: '#000', fontWeight: 'bold'}}>Create</Text></TouchableOpacity>
             </View>
          </View>
          <View style={styles.card}>
             <Text style={styles.cardTitle}>📂 Saved Files</Text>
             {khazanaItems.length === 0 ? <Text style={{color: COLORS.textMuted}}>Khazana khali hai.</Text> : khazanaItems.map((item, index) => (
                 <View key={index} style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border}}>
                     <Text style={{color: COLORS.textMain, fontSize: 16}}>{item.includes('.txt') ? '📄' : '📁'} {item}</Text>
                     <TouchableOpacity onPress={() => deleteKhazanaItem(item)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                 </View>
             ))}
          </View>
        </ScrollView>
      )}

      {/* ⚙️ SETTINGS TAB */}
      {activeTab === "SETTINGS" && (
        <ScrollView style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>⚙️ Settings & Vault</Text>
          
          {/* OFFLINE MODEL SECTION */}
          <View style={[styles.card, {marginBottom: 20}]}>
            <Text style={styles.cardTitle}>🧠 Offline Local Engine</Text>
            {!modelExists ? ( <Text style={{color: COLORS.textMuted}}>Model not found on device.</Text> ) : (
              !isModelLoaded ? (
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.warning}]} onPress={loadOfflineModel} disabled={isThinking}>
                  <Text style={styles.actionBtnText}>{isThinking ? "Starting..." : "Start Offline AI"}</Text>
                </TouchableOpacity>
              ) : ( <Text style={{color: COLORS.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'center'}}>🟢 Engine is Running!</Text> )
            )}
          </View>

          {/* MULTI API VAULT */}
          <View style={styles.card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={styles.cardTitle}>🔌 Connected APIs</Text>
                <TouchableOpacity onPress={() => setIsAddingApi(!isAddingApi)}><Text style={{color: COLORS.cloud, fontSize: 24, fontWeight: 'bold'}}>{isAddingApi ? "✖" : "➕"}</Text></TouchableOpacity>
            </View>
            {isAddingApi && (
              <View style={{marginBottom: 20, padding: 15, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cloud}}>
                <TextInput style={styles.keyInput} placeholder="AIza..., sk-..., tvly-..." placeholderTextColor={COLORS.textMuted} value={inputKey} onChangeText={setInputKey} secureTextEntry />
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.cloud, marginTop: 10}]} onPress={saveNewConnection}><Text style={styles.actionBtnText}>Save</Text></TouchableOpacity>
              </View>
            )}
            
            <Text style={{color: COLORS.textMuted, fontWeight: 'bold', marginTop: 10}}>🧠 ENGINES (Brains)</Text>
            {connections.filter(c => c.type === 'engine').map((conn) => (
                <View key={conn.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginVertical: 5, borderWidth: 1, borderColor: activeEngineId === conn.id ? conn.color : COLORS.border}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <TouchableOpacity onPress={() => makeActiveEngine(conn.id)} style={{marginRight: 10}}>
                            <View style={{width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: conn.color, justifyContent: 'center', alignItems: 'center'}}>{activeEngineId === conn.id && <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: conn.color}} />}</View>
                        </TouchableOpacity>
                        <Text style={{color: COLORS.textMain, fontWeight: 'bold'}}>{conn.provider}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteConnection(conn.id)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                </View>
            ))}
            
            <Text style={{color: COLORS.textMuted, fontWeight: 'bold', marginTop: 15}}>🛠️ TOOLS (Skills)</Text>
            {connections.filter(c => c.type === 'tool').map((conn) => (
                <View key={conn.id} style={{flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginVertical: 5, borderWidth: 1, borderColor: conn.color}}>
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
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("KHAZANA")}><Text style={styles.navIcon}>📁</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("SETTINGS")}><Text style={styles.navIcon}>⚙️</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 15, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border }, headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: 'bold' }, screenContainer: { flex: 1 }, screenPadding: { flex: 1, padding: 20 }, sectionTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: 'bold', marginBottom: 5 }, card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }, cardTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }, actionBtn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }, keyInput: { backgroundColor: COLORS.background, color: COLORS.textMain, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 16 }, switchContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border, gap: 10 }, chatScrollArea: { padding: 15, paddingBottom: 20 }, messageRow: { ma
