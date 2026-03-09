/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v1.0            ║
 * ║          "Mera Khazana" Offline-First Digital Twin              ║
 * ║          Anti-White Screen & Safe Render Edition                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Animated, StatusBar, Platform,
  KeyboardAvoidingView, SafeAreaView
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
// Removed llama.rn import temporarily to prevent premature native crashes
import { GoogleGenerativeAI } from "@google/generative-ai";

const { width: W, height: H } = Dimensions.get("window");

const PALETTE = {
  void: "#000000", matrix: "#001a00", deepGreen: "#003300",
  neonGreen: "#00ff41", dimGreen: "#00cc33", ghostGreen: "#004d1a",
  cyanAccent: "#00ffff", silver: "#aaaaaa", white: "#ffffff",
  panelBg: "rgba(0,20,0,0.85)", panelBorder: "rgba(0,255,65,0.2)",
  inputBg: "rgba(0,30,0,0.9)", glowGreen: "rgba(0,255,65,0.15)",
};

const SECURE_KEYS = { gemini: "raju_gemini_api_key" };

// ─── Safely Get Paths ─────────────────────────────────────────────────────
const getVaultPaths = () => {
  const root = FileSystem.documentDirectory ? FileSystem.documentDirectory + "MeraKhazana/" : "file:///MeraKhazana/";
  return {
    neuralArchives: root + "Neural_Archives/",
    mediaVault: root + "Media_Vault/",
    chabiManager: root + "Chabi_Manager/",
    neuralModels: root + "Neural_Models/",
  };
};

// ─── Error Boundary (Kills White Screen) ──────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorText: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorText: error.toString() };
  }
  componentDidCatch(error, errorInfo) {
    console.error("APP CRASHED:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#330000', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: '#ff4444', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>⚠️ CRASH DETECTED</Text>
          <Text style={{ color: '#fff', fontSize: 14 }}>{this.state.errorText}</Text>
          <Text style={{ color: '#aaa', fontSize: 12, marginTop: 20 }}>Raju Bhai, is error ka screenshot le lijiye!</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// ─── Animations & Effects ────────────────────────────────────────────────
const useMatrixRain = () => {
  const animations = useRef(
    Array.from({ length: 12 }, () => ({
      anim: new Animated.Value(0),
      x: Math.random() * W,
      delay: Math.random() * 3000,
      duration: 2000 + Math.random() * 3000,
      char: "01アイウエオカキクケコ".split(""),
    }))
  ).current;

  useEffect(() => {
    animations.forEach(({ anim, delay, duration }) => {
      const loop = () => {
        anim.setValue(0);
        Animated.timing(anim, { toValue: 1, duration, delay, useNativeDriver: true }).start(loop);
      };
      loop();
    });
  }, []);
  return animations;
};

const MatrixRain = () => {
  const drops = useMatrixRain();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, i) => (
        <Animated.Text
          key={i}
          style={{
            position: "absolute", left: drop.x,
            top: drop.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, H + 20] }),
            color: PALETTE.neonGreen, fontSize: 12, opacity: 0.3,
            fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
          }}
        >
          {drop.char[i % drop.char.length]}
        </Animated.Text>
      ))}
    </View>
  );
};

const PulseDot = ({ color = PALETTE.neonGreen, size = 8 }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ scale: pulse }] }} />;
};

const GlitchText = ({ text, style }) => {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 80);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Text style={[style, glitch && { textShadowColor: PALETTE.cyanAccent, textShadowOffset: { width: 2, height: 0 }, textShadowRadius: 4, color: PALETTE.white }]}>
      {text}
    </Text>
  );
};

const AnimatedBubble = ({ children, isUser }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.bubbleWrapper,
      isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAI,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      {children}
    </Animated.View>
  );
};

const TerminalLine = ({ text, color = PALETTE.neonGreen, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start(); }, []);
  return <Animated.Text style={[styles.terminalLine, { color, opacity }]}>{text}</Animated.Text>;
};

// ─── Vault Initializer ────────────────────────────────────────────────────
const initMeraKhazana = async () => {
  const logs = [];
  try {
    const paths = getVaultPaths();
    for (const [key, path] of Object.entries(paths)) {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
        logs.push(`✓ Created ${path.split("/").slice(-2, -1)[0]}`);
      } else {
        logs.push(`◈ Verified ${path.split("/").slice(-2, -1)[0]}`);
      }
    }
    logs.push("█ MERA KHAZANA ONLINE █");
    return { success: true, logs };
  } catch (err) {
    logs.push(`✗ CRITICAL: ${err.message}`);
    return { success: false, logs };
  }
};

// ─── Hybrid Intelligence Engine ───────────────────────────────────────────
class HybridIntelligence {
  constructor() {
    this.geminiClient = null;
    this.mode = "offline";
  }

  async detectMode() {
    try {
      const net = await Network.getNetworkStateAsync();
      this.mode = net.isConnected && net.isInternetReachable ? "hybrid" : "offline";
    } catch { this.mode = "offline"; }
    return this.mode;
  }

  async initGemini(apiKey) {
    if (!apiKey) return false;
    try {
      this.geminiClient = new GoogleGenerativeAI(apiKey);
      return true;
    } catch(e) {
      console.log("Gemini Init Error:", e);
      return false;
    }
  }

  async generateResponse(prompt) {
    const mode = await this.detectMode();

    if (mode === "hybrid" && this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return { text: result.response.text(), engine: "GEMINI_CLOUD", mode: "hybrid" };
      } catch (err) {
        throw new Error(`Cloud engine failed: ${err.message}`);
      }
    }

    await new Promise(r => setTimeout(r, 1200));
    return { 
      text: `[RAJU SOVEREIGN MODE]\n\nMera Khazana vault is active. You are offline. Please load a GGUF model or connect to the internet to use Gemini.`, 
      engine: "RAJU_CORE", 
      mode: "offline" 
    };
  }
}
const intelligence = new HybridIntelligence();

// ─── Boot Screen ──────────────────────────────────────────────────────────
const BootScreen = ({ onComplete }) => {
  const [bootLogs, setBootLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      try {
        const addLog = (msg) => { if(isMounted) setBootLogs(prev => [...prev, msg]); };
        addLog("▶ RAJU AI SOVEREIGN BOOT v1.0");
        await new Promise(r => setTimeout(r, 500));
        
        const vault = await initMeraKhazana();
        vault.logs.forEach(addLog);
        
        const mode = await intelligence.detectMode();
        addLog(`◈ Intelligence mode: ${mode.toUpperCase()}`);
        
        if(isMounted) setProgress(100);
        Animated.timing(progressAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
        
        await new Promise(r => setTimeout(r, 1000));
        if(isMounted) onComplete({ networkMode: mode });
      } catch (e) {
        if(isMounted) setBootLogs(prev => [...prev, `✗ BOOT ERROR: ${e.message}`]);
      }
    };
    boot();
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.bootScreen}>
      <MatrixRain />
      <View style={styles.bootTerminal}>
        <ScrollView showsVerticalScrollIndicator={false} ref={r => r?.scrollToEnd({ animated: true })}>
          {bootLogs.map((log, i) => <TerminalLine key={i} text={log} delay={i * 50} color={log.includes("█") ? PALETTE.neonGreen : (log.includes("✗") ? PALETTE.crimson : PALETTE.silver)} />)}
        </ScrollView>
      </View>
      <View style={styles.bootProgressTrack}>
        <Animated.View style={[styles.bootProgressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
    </View>
  );
};

// ─── Header & Chat ────────────────────────────────────────────────────────
const Header = ({ networkMode, activeTab, onTabChange }) => (
  <View style={styles.header}>
    <View style={styles.headerBrand}>
      <GlitchText text="RAJU" style={styles.headerTitle} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PulseDot color={networkMode === "hybrid" ? PALETTE.cyanAccent : PALETTE.neonGreen} size={6} />
        <Text style={{ color: PALETTE.neonGreen, fontSize: 10, marginLeft: 5 }}>{networkMode.toUpperCase()}</Text>
      </View>
    </View>
    <View style={styles.headerTabs}>
      {["chat", "vault", "secure"].map(tab => (
        <TouchableOpacity key={tab} style={[styles.headerTab, activeTab === tab && styles.headerTabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTabChange(tab); }}>
          <Text style={[styles.headerTabLabel, activeTab === tab && styles.headerTabLabelActive]}>{tab.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const LiveChatScreen = () => {
  const [messages, setMessages] = useState([{ id: "1", role: "assistant", content: "Namaste Raju Bhai. Mera Khazana is secure. How can I assist you?", engine: "RAJU_CORE", mode: "sovereign" }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newUserMsg = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await intelligence.generateResponse(newUserMsg.content);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", ...response }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `[ERROR]: ${error.message}`, engine: "ERROR", mode: "offline" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View style={styles.chatContainer}>
      <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.chatScroll}>
        {messages.map(msg => (
          <AnimatedBubble key={msg.id} isUser={msg.role === "user"}>
            <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
              {msg.role !== "user" && <Text style={{ color: PALETTE.dimGreen, fontSize: 10, marginBottom: 5 }}>[{msg.engine}]</Text>}
              <Text style={{ color: msg.role === "user" ? PALETTE.neonGreen : PALETTE.white, fontSize: 15 }}>{msg.content}</Text>
            </View>
          </AnimatedBubble>
        ))}
        {isTyping && <View style={{ padding: 10, alignSelf: 'flex-start' }}><PulseDot color={PALETTE.neonGreen} size={10} /></View>}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputArea}>
        <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
          <TextInput style={styles.inputBox} placeholder="Aadesh dein..." placeholderTextColor={PALETTE.silver} value={input} onChangeText={setInput} multiline />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={{ color: PALETTE.neonGreen, fontWeight: 'bold' }}>EXE</Text>
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Main App Wrapped Component ───────────────────────────────────────────
function MainApp() {
  const [isBooting, setIsBooting] = useState(true);
  const [networkMode, setNetworkMode] = useState("offline");
  const [activeTab, setActiveTab] = useState("chat");
  const mainFadeAnim = useRef(new Animated.Value(0)).current;

  const handleBootComplete = async (sysInfo) => {
    setNetworkMode(sysInfo.networkMode);
    try {
      const key = await SecureStore.getItemAsync(SECURE_KEYS.gemini);
      if (key) await intelligence.initGemini(key);
    } catch (e) {
      console.log("SecureStore Error:", e);
    }
    setIsBooting(false);
    Animated.timing(mainFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  };

  if (isBooting) return <BootScreen onComplete={handleBootComplete} />;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PALETTE.void} />
      <Animated.View style={[styles.mainContent, { opacity: mainFadeAnim }]}>
        <Header networkMode={networkMode} activeTab={activeTab} onTabChange={setActiveTab} />
        <View style={styles.mainContent}>
          {activeTab === "chat" && <LiveChatScreen />}
          {activeTab === "vault" && <View style={{padding:20}}><Text style={{color:PALETTE.neonGreen, fontSize: 20}}>◈ KHAZANA (Folders Created)</Text></View>}
          {activeTab === "secure" && <View style={{padding:20}}><Text style={{color:PALETTE.neonGreen, fontSize: 20}}>⬡ SECURE VAULT</Text></View>}
        </View>
      </Animated.View>
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

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.void },
  mainContent: { flex: 1 },
  header: { padding: 15, borderBottomWidth: 1, borderBottomColor: PALETTE.panelBorder, backgroundColor: PALETTE.panelBg },
  headerBrand: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerTitle: { color: PALETTE.neonGreen, fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  headerTabs: { flexDirection: 'row', justifyContent: 'space-around' },
  headerTab: { padding: 8, borderRadius: 5 },
  headerTabActive: { backgroundColor: PALETTE.glowGreen, borderWidth: 1, borderColor: PALETTE.neonGreen },
  headerTabLabel: { color: PALETTE.silver, fontSize: 12, fontWeight: 'bold' },
  headerTabLabelActive: { color: PALETTE.neonGreen },
  chatContainer: { flex: 1 },
  chatScroll: { padding: 15, paddingBottom: 100 },
  bubbleWrapper: { marginBottom: 15, maxWidth: '85%' },
  bubbleWrapperUser: { alignSelf: 'flex-end' },
  bubbleWrapperAI: { alignSelf: 'flex-start' },
  bubble: { padding: 12, borderRadius: 8, borderWidth: 1 },
  bubbleUser: { backgroundColor: PALETTE.ghostGreen, borderColor: PALETTE.dimGreen, borderBottomRightRadius: 0 },
  bubbleAI: { backgroundColor: PALETTE.panelBg, borderColor: PALETTE.panelBorder, borderBottomLeftRadius: 0 },
  inputArea: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  inputBlur: { flexDirection: 'row', padding: 10, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: PALETTE.panelBorder },
  inputBox: { flex: 1, backgroundColor: PALETTE.inputBg, color: PALETTE.neonGreen, minHeight: 45, borderRadius: 5, padding: 12, borderWidth: 1, borderColor: PALETTE.panelBorder, marginRight: 10 },
  sendButton: { backgroundColor: PALETTE.deepGreen, width: 50, height: 45, borderRadius: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PALETTE.neonGreen },
  bootScreen: { flex: 1, backgroundColor: PALETTE.void, justifyContent: 'center', padding: 30 },
  bootTerminal: { height: 200, backgroundColor: 'rgba(0,10,0,0.8)', borderWidth: 1, borderColor: PALETTE.panelBorder, borderRadius: 5, padding: 10, marginBottom: 20 },
  terminalLine: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace", marginBottom: 4 },
  bootProgressTrack: { width: '100%', height: 4, backgroundColor: '#111', borderRadius: 2 },
  bootProgressFill: { height: '100%', backgroundColor: PALETTE.neonGreen }
});
    
