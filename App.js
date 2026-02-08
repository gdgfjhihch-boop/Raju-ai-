import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { LlamaContext } from 'llama.rn';

export default function App() {
  const [modelUrl, setModelUrl] = useState('https://huggingface.co/HuggingFaceFW/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q4_k_m.gguf');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [context, setContext] = useState(null);

  const downloadModel = async () => {
    setIsDownloading(true);
    const fileUri = FileSystem.documentDirectory + 'model.gguf';
    const downloadResumable = FileSystem.createDownloadResumable(
      modelUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      }
    );

    try {
      const { uri } = await downloadResumable.downloadAsync();
      setIsDownloading(false);
      Alert.alert('Success', 'Model Downloaded! Initializing...');
      initLlama(uri);
    } catch (e) {
      console.error(e);
      setIsDownloading(false);
      Alert.alert('Error', 'Download failed');
    }
  };

  const initLlama = async (path) => {
    try {
      const ctx = await LlamaContext.create({
        model: path,
        n_ctx: 2048,
      });
      setContext(ctx);
      setIsModelLoaded(true);
      Alert.alert('Ready', 'AI is ready to chat!');
    } catch (err) {
      Alert.alert('Error', 'Failed to load model: ' + err.message);
    }
  };

  const sendMessage = async () => {
    if (!context) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatLog(prev => [...prev, userMsg]);
    setChatInput('');

    try {
      const response = await context.completion({
        prompt: chatInput,
        n_predict: 100,
      });
      setChatLog(prev => [...prev, { role: 'ai', content: response.text }]);
    } catch (e) {
      Alert.alert('Error', 'Generation failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Universal AI Player</Text>
      
      {!isModelLoaded ? (
        <View style={styles.section}>
          <Text style={styles.label}>Paste HuggingFace GGUF Link:</Text>
          <TextInput style={styles.input} value={modelUrl} onChangeText={setModelUrl} />
          
          {isDownloading ? (
             <View>
               <ActivityIndicator size="large" color="#0000ff" />
               <Text style={{textAlign:'center'}}>Downloading: {(downloadProgress * 100).toFixed(0)}%</Text>
             </View>
          ) : (
            <Button title="Download & Load Model" onPress={downloadModel} />
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <ScrollView style={styles.chatBox}>
            {chatLog.map((msg, index) => (
              <Text key={index} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
                {msg.role === 'user' ? 'You: ' : 'AI: '} {msg.content}
              </Text>
            ))}
          </ScrollView>
          <TextInput style={styles.input} value={chatInput} onChangeText={setChatInput} placeholder="Ask something..." />
          <Button title="Send" onPress={sendMessage} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { gap: 10, flex: 1 },
  label: { marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, backgroundColor: '#fff', marginBottom: 10 },
  chatBox: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8 },
  userMsg: { color: '#007AFF', marginBottom: 5, fontWeight: 'bold' },
  aiMsg: { color: '#333', marginBottom: 5 },
});
