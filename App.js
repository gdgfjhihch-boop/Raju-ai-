/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v8.9            ║
 * ║          SMART FOLDERS (SEASONS), NAVIGATION & CUSTOM MODELS    ║
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

const OFFLINE_MODELS = [
  { id: "qwen", name: "Qwen 1.8B", file: "qwen1.8b.gguf", url: "https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1_5-1_8b-chat-q4_k_m.gguf" },
  { id: "tiny", name: "TinyLlama", file: "tinyllama.gguf", url: "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q2_K.gguf" }
];

const SECURE_CONNECTIONS = "raju_api_connections"; 
const SECURE_ACTIVE_ENGINE = "raju_active_engine";
const KHAZANA_ROOT = FileSystem.documentDirectory + "Raju_Khazana/";

export default function App() {
  const [activeTab, setActiveTab] = useState("CHAT"); 
  const [useCloud, setUseCloud] = useState(true); 
  
  const [connections, setConnections] = useState([]); 
  const [activeEngineId, setActiveEngineId] = useState(null); 
  const [inputKey, setInputKey] = useState("");
  const [inputModelId, setInputModelId] = useState(""); 
  const [isAddingApi, setIsAddingApi] = useState(false); 
  
  const [selectedOfflineModel, setSelectedOfflineModel] = useState(OFFLINE_MODELS[0]);
  const [customModelUrl, setCustomModelUrl] = useState("");
  const [llamaContext, setLlamaContext] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelExists, setModelExists] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const [messages, setMessages] = useState([
    { id: "1", role: "ai", text: "Namaste Raju Bhai! Ab main Folders ke andar sub-folders (Seasons) bana sakta hu aur aap Custom Model link bhi daal sakte hain!" }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);

  // Khazana State
  const [khazanaItems, setKhazanaItems] = useState([]);
  const [currentPath, setCurrentPath] = useState(KHAZANA_ROOT);
  const [newFolderName, setNewFolderName] = useState("");

  const getModelPath = (filename) => FileSystem.documentDirectory + filename;

  useEffect(() => { 
    checkModelExists(selectedOfflineModel);
    loadConnections(); 
    initKhazana(); 
  }, []);

  useEffect(() => { checkModelExists(selectedOfflineModel); }, [selectedOfflineModel]);

  useEffect(() => {
    if (inputKey.startsWith("AIza") && !inputModelId) setInputModelId("gemini-1.5-flash");
    if (inputKey.startsWith("sk-") && !inputModelId) setInputModelId("gpt-3.5-turbo");
    if (inputKey.startsWith("tvly-") && !inputModelId) setInputModelId("search-basic");
  }, [inputKey]);

  const checkModelExists = async (modelObj) => { 
    const info = await FileSystem.getInfoAsync(getModelPath(modelObj.file)); 
    setModelExists(info.exists); 
  };

  const downloadModel = async (urlToDownload, fileName) => {
    if(!urlToDownload) return;
    setIsDownloading(true);
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        urlToDownload, getModelPath(fileName), {},
        (progressInfo) => {
          const progress = progressInfo.totalBytesWritten / progressInfo.totalBytesExpectedToWrite;
          setDownloadProgress(Math.round(progress * 100));
        }
      );
      await downloadResumable.downloadAsync();
      setModelExists(true);
      setCustomModelUrl("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { alert("Download failed: " + e.message); }
    setIsDownloading(false); setDownloadProgress(0);
  };

  // ─── 📁 KHAZANA (SMART FILE MANAGER) ───
  const initKhazana = async () => {
    const dirInfo = await FileSystem.getInfoAsync(KHAZANA_ROOT);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(KHAZANA_ROOT, { intermediates: true });
    loadKhazanaFiles(KHAZANA_ROOT);
  };

  const loadKhazanaFiles = async (path) => {
    try { const files = await FileSystem.readDirectoryAsync(path); setKhazanaItems(files); setCurrentPath(path); } catch (e) {}
  };

  const handleKhazanaItemClick = async (item) => {
    const isFile = item.includes('.');
    if (!isFile) {
      loadKhazanaFiles(currentPath + item + "/");
    } else {
      alert("File Viewer abhi aana baaki hai. Ye file hai: " + item);
    }
  };

  const goBackKhazana = () => {
    if (currentPath === KHAZANA_ROOT) return;
    let pathArray = currentPath.split("/");
    pathArray.splice(-2, 1); // Remove current folder
    const newPath = pathArray.join("/");
    loadKhazanaFiles(newPath);
  };

  const createFolderManually = async () => {
    if(!newFolderName.trim()) return;
    await FileSystem.makeDirectoryAsync(currentPath + newFolderName.trim() + "/", { intermediates: true });
    setNewFolderName(""); loadKhazanaFiles(currentPath); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteKhazanaItem = async (itemName) => {
    Alert.alert("Delete?", `${itemName} ko delete karein?`, [
      { text: "Cancel", style: "cancel" }, 
      { text: "Delete", style: "destructive", onPress: async () => { await FileSystem.deleteAsync(currentPath + itemName, { idempotent: true }); loadKhazanaFiles(currentPath); } }
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
    else if (keyToSave.startsWith("tvly-")) { provider = "Tavily Search"; type = "tool"; color = COLORS.tool; } 
    if (provider === "unknown") { alert("Unknown API Key!"); return; }

    const finalModelId = inputModelId.trim() || "default";
    const newConn = { id: Date.now().toString(), provider, key: keyToSave, type, color, modelId: finalModelId };
    const updatedConns = [...connections, newConn];
    await SecureStore.setItemAsync(SECURE_CONNECTIONS, JSON.stringify(updatedConns));
    setConnections(updatedConns);
    
    if (type === "engine" && !activeEngineId) { setActiveEngineId(newConn.id); await SecureStore.setItemAsync(SECURE_ACTIVE_ENGINE, newConn.id); }
    setInputKey(""); setInputModelId(""); setIsAddingApi(false);
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

  const loadOfflineModel = async () => {
    try { setIsThinking(true); const context = await initLlama({ model: getModelPath(selectedOfflineModel.file), use_mlock: true, n_ctx: 1024 }); setLlamaContext(context); setIsModelLoaded(true); setUseCloud(false); setActiveTab("CHAT"); } 
    catch (e) { alert("Load Error: " + e.message); }
    setIsThinking(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userText }]);
    setInput(""); setIsThinking(true);

    const lowerText = userText.toLowerCase();

    // 🌐 1. TAVILY INTERNET SEARCH
    if (lowerText.startsWith("search:") || lowerText.startsWith("net:")) {
      const query = userText.substring(userText.indexOf(":") + 1).trim();
      let tavilyConn = connections.find(c => c.provider === "Tavily Search");

      if (!tavilyConn) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Settings mein pehle Tavily API Key add karein." }]);
        setIsThinking(false); return;
      }

      try {
        const searchRes = await fetch("https://api.tavily.com/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyConn.key, query: query, include_answer: true })
        });
        const searchData = await searchRes.json();
        let finalAnswer = searchData.answer || (searchData.results && searchData.results[0]?.content);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `🌐 Search Result:\n\n${finalAnswer || "Kuch nahi mila."}`, routerStatus: "🔎 Tavily Internet" }]);
      } catch (err) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `❌ Search Error: ${err.message}` }]); }
      setIsThinking(false); return;
    }

    // 📁 2. SMART KHAZANA (Web Series Style Folders)
    // Command format: "Save: Share Market/Season 1/Episode 1 | Content here"
    if (lowerText.startsWith("save:") || lowerText.startsWith("note likho:")) {
      const splitChar = lowerText.startsWith("save:") ? "save:" : "note likho:";
      const parts = userText.split("|");
      
      if(parts.length >= 2) {
         let pathInfo = parts[0].substring(parts[0].toLowerCase().indexOf(splitChar) + splitChar.length).trim();
         const content = parts.slice(1).join("|").trim();
         
         const isNested = pathInfo.includes("/");
         const folderStructure = isNested ? pathInfo.substring(0, pathInfo.lastIndexOf("/")) + "/" : "";
         const fileName = (isNested ? pathInfo.substring(pathInfo.lastIndexOf("/") + 1) : pathInfo) + ".txt";

         try {
           if(folderStructure) {
             await FileSystem.makeDirectoryAsync(KHAZANA_ROOT + folderStructure, { intermediates: true });
           }
           await FileSystem.writeAsStringAsync(KHAZANA_ROOT + folderStructure + fileName, content);
           loadKhazanaFiles(currentPath); // Refresh UI
           setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `📝 Done! Khazana ke [${folderStructure}] mein '${fileName}' save ho gayi.`, routerStatus: "🛠️ Local System" }]);
         } catch(e) {
           setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `❌ Save Error: ${e.message}`, routerStatus: "🛠️ Local System" }]);
         }
         setIsThinking(false); return;
      }
    }

    // ☁️ 3. CLOUD ENGINE
    if (useCloud) {
      let activeConn = connections.find(c => c.id === activeEngineId);
      if (!activeConn) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Koi Active Engine select nahi kiya hai." }]); setIsThinking(false); return; }
      try {
        let aiResponseText = "";
        if (activeConn.provider === "Gemini") {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeConn.modelId}:generateContent?key=${activeConn.key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${userText}\n(Respond briefly in Hindi)` }] }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          aiResponseText = data.candidates[0].content.parts[0].text;
        } else if (activeConn.provider === "OpenAI") {
          const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeConn.key}` }, body: JSON.stringify({ model: activeConn.modelId, messages: [{ role: "user", content: userText }] })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          aiResponseText = data.choices[0].message.content;
        } else { aiResponseText = "⚠️ Ye engine abhi chat ke liye configure nahi hai."; }
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: aiResponseText, routerStatus: `☁️ ${activeConn.modelId}` }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: `❌ API Error: ` + error.message }]); }
    } 
    
    // 🧠 4. OFFLINE ENGINE
    else {
      if (!isModelLoaded || !llamaContext) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "⚠️ Offline Model start nahi hua hai." }]); setIsThinking(false); return; }
      try {
        const result = await llamaContext.completion({ prompt: `<|im_start|>system\nYou are Raju AI, a highly intelligent assistant.<|im_end|>\n<|im_start|>user\n${userText}<|im_end|>\n<|im_start|>assistant\n`, n_predict: 200 });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: result.text.trim(), routerStatus: `🧠 Offline Local` }]);
      } catch (error) { setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: "❌ Offline Error: " + error.message }]); }
    }
    setIsThinking(false);
  };
      return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}><Text style={styles.headerTitle}>Raju AI</Text></View>

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
              <TextInput style={styles.textInput} placeholder="e.g. Save: Share Market/Season 1/Episode 1 | Data..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} multiline />
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
             <Text style={styles.cardTitle}>➕ Create Folder Manually</Text>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput style={[styles.keyInput, {flex: 1, marginRight: 10}]} placeholder="Folder Name..." placeholderTextColor={COLORS.textMuted} value={newFolderName} onChangeText={setNewFolderName} />
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.folder, paddingHorizontal: 15}]} onPress={createFolderManually}><Text style={{color: '#000', fontWeight: 'bold'}}>Create</Text></TouchableOpacity>
             </View>
          </View>

          <View style={styles.card}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <Text style={styles.cardTitle}>📂 Files</Text>
                {currentPath !== KHAZANA_ROOT && (
                  <TouchableOpacity onPress={goBackKhazana} style={{backgroundColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5}}>
                    <Text style={{color: COLORS.textMain}}>⬅️ Back</Text>
                  </TouchableOpacity>
                )}
             </View>
             
             <Text style={{color: COLORS.warning, fontSize: 10, marginBottom: 10, fontStyle: 'italic'}}>Path: {currentPath.replace(KHAZANA_ROOT, "Root/")}</Text>

             {khazanaItems.length === 0 ? <Text style={{color: COLORS.textMuted}}>Folder khali hai.</Text> : khazanaItems.map((item, index) => {
                 const isFile = item.includes('.');
                 return (
                 <TouchableOpacity key={index} onPress={() => handleKhazanaItemClick(item)} style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border, alignItems: 'center'}}>
                     <Text style={{color: isFile ? COLORS.textMain : COLORS.folder, fontSize: 16, fontWeight: isFile ? 'normal' : 'bold'}}>{isFile ? '📄' : '📁'} {item}</Text>
                     <TouchableOpacity onPress={() => deleteKhazanaItem(item)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                 </TouchableOpacity>
                 );
             })}
          </View>
        </ScrollView>
      )}

      {/* ⚙️ SETTINGS TAB */}
      {activeTab === "SETTINGS" && (
        <ScrollView style={styles.screenPadding}>
          <Text style={styles.sectionTitle}>⚙️ Settings & Vault</Text>
          
          <View style={[styles.card, {marginBottom: 20}]}>
            <Text style={styles.cardTitle}>🧠 Offline Local Engine</Text>
            
            {/* Quick Presets */}
            <View style={{flexDirection: 'row', marginBottom: 15, backgroundColor: COLORS.background, borderRadius: 8}}>
              {OFFLINE_MODELS.map(model => (
                <TouchableOpacity key={model.id} onPress={() => setSelectedOfflineModel(model)} style={{flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: selectedOfflineModel.id === model.id ? 2 : 0, borderColor: COLORS.primary}}>
                  <Text style={{color: selectedOfflineModel.id === model.id ? COLORS.primary : COLORS.textMuted, fontSize: 12, fontWeight: 'bold'}}>{model.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom URL Input */}
            <View style={{marginBottom: 15}}>
               <Text style={{color: COLORS.textMuted, fontSize: 12, marginBottom: 5}}>Or Paste Custom HuggingFace .gguf URL:</Text>
               <View style={{flexDirection: 'row'}}>
                 <TextInput style={[styles.keyInput, {flex: 1, marginRight: 5}]} placeholder="https://.../model.gguf" placeholderTextColor={COLORS.textMuted} value={customModelUrl} onChangeText={setCustomModelUrl} />
                 <TouchableOpacity style={[styles.actionBtn, {backgroundColor: customModelUrl ? COLORS.cloud : COLORS.border, paddingHorizontal: 10}]} disabled={!customModelUrl || isDownloading} onPress={() => downloadModel(customModelUrl, "custom_model.gguf")}>
                   <Text style={{color: '#fff', fontWeight: 'bold'}}>⬇️</Text>
                 </TouchableOpacity>
               </View>
            </View>

            {!modelExists ? (
              <View>
                <Text style={{color: COLORS.textMuted, marginBottom: 10}}>Default Model not found.</Text>
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.cloud}]} onPress={() => downloadModel(selectedOfflineModel.url, selectedOfflineModel.file)} disabled={isDownloading}>
                  <Text style={styles.actionBtnText}>{isDownloading ? `Downloading... ${downloadProgress}%` : "⬇️ Download Presets"}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              !isModelLoaded ? (
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: COLORS.warning}]} onPress={loadOfflineModel} disabled={isThinking}>
                  <Text style={styles.actionBtnText}>{isThinking ? "Starting..." : "Start Offline AI"}</Text>
                </TouchableOpacity>
              ) : ( <Text style={{color: COLORS.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'center'}}>🟢 Engine is Running!</Text> )
            )}
          </View>

          <View style={styles.card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={styles.cardTitle}>🔌 Connected APIs</Text>
                <TouchableOpacity onPress={() => setIsAddingApi(!isAddingApi)}><Text style={{color: COLORS.cloud, fontSize: 24, fontWeight: 'bold'}}>{isAddingApi ? "✖" : "➕"}</Text></TouchableOpacity>
            </View>
            {isAddingApi && (
              <View style={{marginBottom: 20, padding: 15, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cloud}}>
                <TextInput style={[styles.keyInput, {marginBottom: 10}]} placeholder="API Key (tvly-..., AIza...)" placeholderTextColor={COLORS.textMuted} value={inputKey} onChangeText={setInputKey} secureTextEntry />
                <TextInput style={styles.keyInput} placeholder="Model (gemini-pro, search-basic)" placeholderTextColor={COLORS.textMuted} value={inputModelId} onChangeText={setInputModelId} />
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
                        <View><Text style={{color: COLORS.textMain, fontWeight: 'bold'}}>{conn.provider}</Text><Text style={{color: COLORS.textMuted, fontSize: 12}}>{conn.modelId}</Text></View>
                    </View>
                    <TouchableOpacity onPress={() => deleteConnection(conn.id)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                </View>
            ))}
            
            <Text style={{color: COLORS.textMuted, fontWeight: 'bold', marginTop: 15}}>🛠️ TOOLS (Skills)</Text>
            {connections.filter(c => c.type === 'tool').map((conn) => (
                <View key={conn.id} style={{flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginVertical: 5, borderWidth: 1, borderColor: conn.color}}>
                    <View><Text style={{color: COLORS.textMain, fontWeight: 'bold'}}>🔎 {conn.provider}</Text></View>
                    <TouchableOpacity onPress={() => deleteConnection(conn.id)}><Text style={{color: COLORS.danger}}>🗑️</Text></TouchableOpacity>
                </View>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("CHAT")}><Text style={styles.navIcon}>💬</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("KHAZANA")}><Text style={styles.navIcon}>📁</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab("SETTINGS")}><Text style={styles.navIcon}>⚙️</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 15, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: "bold" },
  screenContainer: { flex: 1 },
  screenPadding: { flex: 1, padding: 20 },
  sectionTitle: { color: COLORS.textMain, fontSize: 24, fontWeight: "bold", marginBottom: 5 },
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  actionBtn: { padding: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  keyInput: { backgroundColor: COLORS.background, color: COLORS.textMain, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 16 },
  switchContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border, gap: 10 },
  chatScrollArea: { padding: 15, paddingBottom: 20 },
  messageRow: { marginBottom: 15, flexDirection: "row" },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAI: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", padding: 14, borderRadius: 16 },
  bubbleUser: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: "transparent", borderBottomLeftRadius: 4 },
  messageText: { color: COLORS.textMain, fontSize: 16, lineHeight: 22 },
  inputContainer: { flexDirection: "row", padding: 12, backgroundColor: COLORS.surface, alignItems: "flex-end", borderTopWidth: 1, borderColor: COLORS.border },
  textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.textMain, fontSize: 16, minHeight: 48, maxHeight: 120, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  sendButton: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.primary },
  sendIcon: { color: COLORS.textMain, fontSize: 20, marginLeft: 2 },
  bottomNav: { flexDirection: "row", backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border, paddingBottom: Platform.OS === "ios" ? 20 : 10, paddingTop: 10 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navIcon: { fontSize: 22, marginBottom: 4 }
});
              
