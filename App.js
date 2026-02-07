import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { initLlama } from 'llama.rn';
import * as FileSystem from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';

// Phi-3.5-mini-instruct GGUF
const MODEL_URL = 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf';
const MODEL_PATH = `${FileSystem.documentDirectory}phi-3.5-mini.gguf`;

export default function App() {
  useKeepAwake();
  const [isModelReady, setModelReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const llamaRef = useRef(null);

  useEffect(() => {
    setup();
  }, []);

  const setup = async () => {
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      if (info.exists) {
        await initAI();
      } else {
        await download();
      }
    } catch (e) {
      console.error('Setup error:', e);
      alert('Initialization Error');
    }
  };

  const download = async () => {
    setIsDownloading(true);
    const downloadResumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      MODEL_PATH,
      {},
      (downloadProgress) => {
        const p = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setProgress(p);
      }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      if (result) {
        setIsDownloading(false);
        await initAI();
      }
    } catch (e) {
      console.error('Download error:', e);
      setIsDownloading(false);
      alert('Download Failed. Please check your internet connection.');
    }
  };

  const initAI = async () => {
    try {
      // Ensure path has file:// prefix for llama.rn
      const formattedPath = MODEL_PATH.startsWith('file://') ? MODEL_PATH : `file://${MODEL_PATH}`;
      const context = await initLlama({
        model: formattedPath,
        n_ctx: 2048,
        n_gpu_layers: 0, // CPU only for maximum compatibility, can be increased for supported devices
      });
      llamaRef.current = context;
      setModelReady(true);
      setMessages([{ id: '1', role: 'ai', text: 'Namaste! Main Munim AI hoon. Main puri tarah offline kaam kar sakta hoon. Aap mujhse kuch bhi pooch sakte hain.' }]);
    } catch (e) {
      console.error('AI Init error:', e);
      alert('AI Initialization Failed: ' + e.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !llamaRef.current || isTyping) return;
    
    const userText = input.trim();
    setInput('');
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: userText }]);
    
    setIsTyping(true);
    try {
      // Phi-3.5 Prompt Template
      const prompt = `<|user|>\n${userText}<|end|>\n<|assistant|>\n`;
      
      const response = await llamaRef.current.completion({
        prompt,
        n_predict: 200,
        stop: ['<|end|>', '<|user|>', '<|assistant|>', '<|endoftext|>'],
      });
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: response.text.trim() 
      }]);
    } catch (e) {
      console.error('Inference error:', e);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: 'Maaf kijiye, mujhe samajhne mein dikkat hui. Kripya phir se poochiye.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isModelReady) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Munim AI</Text>
        <View style={styles.loaderContainer}>
          <Text style={styles.status}>
            {isDownloading ? `Downloading Brain: ${(progress * 100).toFixed(1)}%` : 'Initializing AI...'}
          </Text>
          <ActivityIndicator size="large" color="#00ff00" />
        </View>
        <Text style={styles.subStatus}>Offline model is ~2.2GB. Please wait.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Munim AI (Offline)</Text>
      </View>
      <FlatList
        data={messages}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.role === 'user' ? styles.user : styles.ai]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Munim is thinking...</Text>
        </View>
      )}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.inputArea}
      >
        <TextInput 
          style={styles.box} 
          value={input} 
          onChangeText={setInput} 
          placeholder="Ask Munim..." 
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity 
          onPress={handleSend} 
          style={[styles.btn, (!input.trim() || isTyping) && styles.btnDisabled]}
          disabled={!input.trim() || isTyping}
        >
          <Text style={styles.btnText}>➤</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#333', alignItems: 'center' },
  headerTitle: { color: '#00ff00', fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212', padding: 20 },
  loaderContainer: { marginVertical: 30, alignItems: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  status: { color: '#00ff00', marginBottom: 15, fontSize: 16 },
  subStatus: { color: '#666', fontSize: 12, textAlign: 'center' },
  msg: { padding: 12, margin: 10, borderRadius: 15, maxWidth: '85%' },
  msgText: { color: '#fff', fontSize: 16 },
  user: { backgroundColor: '#005c4b', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  ai: { backgroundColor: '#333', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  typingContainer: { paddingHorizontal: 20, marginBottom: 5 },
  typingText: { color: '#00ff00', fontSize: 12, fontStyle: 'italic' },
  inputArea: { flexDirection: 'row', padding: 10, alignItems: 'center', backgroundColor: '#1e1e1e' },
  box: { flex: 1, backgroundColor: '#333', color: '#fff', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, maxHeight: 100 },
  btn: { backgroundColor: '#00ff00', width: 50, height: 50, borderRadius: 25, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { backgroundColor: '#1a5c1a' },
  btnText: { fontSize: 20, color: '#000' }
});
