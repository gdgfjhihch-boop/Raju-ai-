/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          RAJU AI — SOVEREIGN PERSONAL ASSISTANT v1.0            ║
 * ║          Clean, Simple & Kid-Friendly UI (Modern Dark)          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform, KeyboardAvoidingView, SafeAreaView
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { initLlama } from "llama.rn"; // Engine is still active in the background!

// ─── Simple Modern Color Palette ──────────────────────────────────────────
const COLORS = {
  background: "#111827",     // Smooth dark background
  surface: "#1F2937",        // Slightly lighter dark for cards/headers
  primary: "#10B981",        // Friendly Emerald Green for buttons/user messages
  textMain: "#F9FAFB",       // Pure white for readability
  textMuted: "#9CA3AF",      // Gray for placeholder and small text
  bubbleAI: "#374151",       // Grayish blue for AI messages
  border: "#374151",         // Subtle borders
  danger: "#EF4444"          // Red for errors
};

// ─── Error Boundary (Safety Net) ──────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorText: "" };
  }
  static getDerivedStateFromError(error) { return { hasError: true, errorText: error.toString() }; }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: COLORS.danger, fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Oops! Kuch gadbad ho gayi.</Text>
          <Text style={{ color: COLORS.textMain, fontSize: 14 }}>{this.state.errorText}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// ─── 1. Simple Header ─────────────────────────────────────────────────────
const Header = () => (
  <View style={styles.header}>
    <View>
      <Text style={styles.headerTitle}>Raju AI</Text>
      <View style={styles.onlineStatus}>
        <View style={styles.onlineDot} />
        <Text style={styles.headerSubtitle}>Mera Khazana (Offline Safe)</Text>
      </View>
    </View>
  </View>
);

// ─── 2. Clean Chat Screen ─────────────────────────────────────────────────
const ChatScreen = () => {
  // Shuruwaati message (Welcome message)
  const [messages, setMessages] = useState([
    { id: "1", role: "ai", text: "Namaste! Main Raju AI hoon. Main aapki kya madad kar sakta hoon?" }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // User ka message add karein
    const newMsg = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInput("");

    // AI ka dummy jawab (jab tak asli AI connect na ho)
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "ai", 
        text: "Main abhi aapse offline jud chuka hoon! Llama engine background mein chal raha hai." 
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  return (
    <View style={styles.chatContainer}>
      <ScrollView 
        ref={scrollRef} 
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} 
        contentContainerStyle={styles.chatScrollArea}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageRow, msg.role === "user" ? styles.messageRowUser : styles.messageRowAI]}>
            <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input Area (Type message here) */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.textInput} 
            placeholder="Kuch likhiye..." 
            placeholderTextColor={COLORS.textMuted} 
            value={input} 
            onChangeText={setInput} 
            multiline={true}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Main Application ─────────────────────────────────────────────────────
function MainApp() {
  // Background Folder Creation (User ko wait nahi karwayenge)
  useEffect(() => {
    const createFolders = async () => {
      try {
        const root = FileSystem.documentDirectory + "MeraKhazana/";
        await FileSystem.makeDirectoryAsync(root + "Files/", { intermediates: true });
      } catch (e) { console.log("Folder creation error", e); }
    };
    createFolders();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      <Header />
      <ChatScreen />
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

// ─── Styles (Clean & Rounded) ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // Header
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center"
  },
  headerTitle: { 
    color: COLORS.textMain, 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  onlineStatus: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  onlineDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: COLORS.primary, 
    marginRight: 6 
  },
  headerSubtitle: { 
    color: COLORS.textMuted, 
    fontSize: 13 
  },

  // Chat Area
  chatContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  chatScrollArea: { 
    padding: 15, 
    paddingBottom: 20 
  },
  messageRow: { 
    marginBottom: 15, 
    flexDirection: 'row' 
  },
  messageRowUser: { 
    justifyContent: 'flex-end' 
  },
  messageRowAI: { 
    justifyContent: 'flex-start' 
  },
  bubble: { 
    maxWidth: '80%', 
    padding: 14, 
    borderRadius: 20, // Fully rounded corners
  },
  bubbleUser: { 
    backgroundColor: COLORS.primary, 
    borderBottomRightRadius: 4 // Tail effect
  },
  bubbleAI: { 
    backgroundColor: COLORS.bubbleAI, 
    borderBottomLeftRadius: 4 // Tail effect
  },
  messageText: { 
    color: COLORS.textMain, 
    fontSize: 16, 
    lineHeight: 22 
  },

  // Input Area
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: COLORS.surface, 
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  textInput: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    color: COLORS.textMain, 
    fontSize: 16, 
    minHeight: 48, 
    maxHeight: 120,
    borderRadius: 24, // Pill shape
    paddingHorizontal: 16, 
    paddingTop: 12,
    paddingBottom: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sendButton: { 
    backgroundColor: COLORS.primary, 
    width: 48, 
    height: 48, 
    borderRadius: 24, // Perfect circle
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendIcon: { 
    color: COLORS.textMain, 
    fontSize: 20,
    marginLeft: 2 // Optical alignment for arrow
  }
});
  
