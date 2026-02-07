import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { initLlama } from 'llama.rn';
import * as FileSystem from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';

const MODEL_URL = 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct.q4.gguf';
const MODEL_PATH = `${FileSystem.documentDirectory}phi-3-mini.gguf`;

export default function App() {
  useKeepAwake();
  const [isModelReady, setModelReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const llamaRef = useRef(null);

  useEffect(() => { setup(); }, []);

  const setup = async () => {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (info.exists) { initAI(); } else { download(); }
  };

  const download = async () => {
    const dr = FileSystem.createDownloadResumable(MODEL_URL, MODEL_PATH, {}, (p) => {
      setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    });
    try { await dr.downloadAsync(); initAI(); } catch (e) { alert('Download Error'); }
  };

  const initAI = async () => {
    try {
      const context = await initLlama({ model: MODEL_PATH, n_ctx: 2048 });
      llamaRef.current = context;
      setModelReady(true);
      setMessages([{ id: '1', role: 'ai', text: 'Namaste! Main Munim hoon. Main offline kaam kar sakta hoon.' }]);
    } catch (e) { alert('AI Init Error'); }
  };

  const handleSend = async () => {
    if (!input.trim() || !llamaRef.current) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    
    const response = await llamaRef.current.completion({
      prompt: `<|user|>\n${userText}<|end|>\n<|assistant|>\n`,
      n_predict: 100,
    });
    setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'ai', text: response.text.trim() }]);
  };

  if (!isModelReady) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Munim AI</Text>
        <Text style={styles.status}>Setting up Brain: {(progress * 100).toFixed(0)}%</Text>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.role === 'user' ? styles.user : styles.ai]}>
            <Text style={{color: '#fff'}}>{item.text}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
      <KeyboardAvoidingView behavior="padding" style={styles.inputArea}>
        <TextInput style={styles.box} value={input} onChangeText={setInput} placeholder="Ask Munim..." placeholderTextColor="#999" />
        <TouchableOpacity onPress={handleSend} style={styles.btn}><Text>➤</Text></TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  status: { color: '#00ff00', marginVertical: 20 },
  msg: { padding: 10, margin: 10, borderRadius: 10, maxWidth: '80%' },
  user: { backgroundColor: '#005c4b', alignSelf: 'flex-end' },
  ai: { backgroundColor: '#333', alignSelf: 'flex-start' },
  inputArea: { flexDirection: 'row', padding: 10 },
  box: { flex: 1, backgroundColor: '#333', color: '#fff', borderRadius: 20, paddingHorizontal: 15 },
  btn: { backgroundColor: '#00ff00', padding: 15, borderRadius: 25, marginLeft: 10 }
});
    
