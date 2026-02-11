import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { LlamaContext } from 'llama.rn';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  // Using a very small, fast model (SmolLM2 135M) for guaranteed performance
  const MODEL_URL = 'https://huggingface.co/HuggingFaceFW/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q4_k_m.gguf';
  const MODEL_PATH = FileSystem.documentDirectory + 'model.gguf';

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);
  const [context, setContext] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const initModel = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
      if (!fileInfo.exists) {
        setLoading(true);
        const downloadResumable = FileSystem.createDownloadResumable(
          MODEL_URL,
          MODEL_PATH,
          {},
          (p) => setDownloadProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite)
        );
        await downloadResumable.downloadAsync();
      }
      
      setLoading(true);
      const ctx = await LlamaContext.create({ model: MODEL_PATH, n_ctx: 2048 });
      setContext(ctx);
      setIsModelReady(true);
      setLoading(false);
    } catch (err) {
      Alert.alert('Error', err.message);
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      const response = await context.completion({ prompt: input, n_predict: 200 });
      setMessages(prev => [...prev, userMsg, { role: 'ai', text: response.text }]);
    } catch (e) {
      Alert.alert('Error', 'AI failed to respond');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Raju AI (Offline)</Text>
      
      {!isModelReady ? (
        <View style={styles.center}>
          <Text style={styles.status}>Setup Required</Text>
          {loading ? (
            <View>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text>{(downloadProgress * 100).toFixed(0)}% Downloaded</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={initModel}>
              <Text style={styles.btnText}>Download & Start AI</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{flex: 1}}>
          <ScrollView style={styles.chat}>
            {messages.map((m, i) => (
              <View key={i} style={[styles.msg, m.role === 'user' ? styles.user : styles.ai]}>
                <Text style={styles.msgText}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.inputArea}>
            <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Ask Raju AI..." />
            <TouchableOpacity style={styles.sendBtn} onPress={send}><Text style={styles.btnText}>Send</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', padding: 15, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  btn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10 },
  sendBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  chat: { flex: 1, padding: 10 },
  msg: { padding: 10, borderRadius: 10, marginBottom: 10, maxWidth: '80%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6' },
  ai: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  inputArea: { flexDirection: 'row', padding: 10, gap: 10, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10 },
});
