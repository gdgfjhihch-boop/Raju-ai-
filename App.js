import React from 'react';
import { View, Text, StatusBar } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Text style={{ color: '#00ff41', fontSize: 28, fontWeight: 'bold' }}>
        SYSTEM ONLINE
      </Text>
      <Text style={{ color: '#ffffff', fontSize: 16, marginTop: 10 }}>
        Raju Bhai, Engine is Working! 🚀
      </Text>
    </View>
  );
}
