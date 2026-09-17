import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../utils/api';

export default function VoiceChatScreen() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'model', text: 'Hello Pankaj! Hold the mic button and speak in English. I will correct you and reply.' }
  ]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (err) {
        console.warn('Audio permission error', err);
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      if (processing) return;
      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setProcessing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        // Read file as Base64
        const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        
        // Send to backend
        const response = await apiFetch('/ai/speech', {
          method: 'POST',
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: 'audio/m4a'
          })
        });

        if (response && response.transcription) {
          // Add user's transcription to UI
          setMessages(prev => [...prev, { role: 'user', text: response.transcription }]);
          
          // Add AI's feedback & reply to UI
          let aiText = response.reply;
          if (response.feedback && response.feedback.toLowerCase() !== 'no errors') {
             aiText = `Coach Note: ${response.feedback}\n\n${aiText}`;
          }
          setMessages(prev => [...prev, { role: 'model', text: aiText }]);

          // Speak out the reply
          Speech.speak(response.reply, { language: 'en-US', rate: 0.9 });
        } else {
          throw new Error('Invalid response from AI');
        }
      }
    } catch (err) {
      console.error('Recording stop error', err);
      Alert.alert('Error', 'Failed to process voice. Try speaking again.');
    } finally {
      setRecording(null);
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>English Voice Coach</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.chatArea} ref={(ref) => ref?.scrollToEnd()}>
        {messages.map((msg, idx) => (
          <View key={idx} style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
            <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
              {msg.text}
            </Text>
          </View>
        ))}
        {processing && (
          <View style={styles.processingBubble}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.processingText}>AI is listening and thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.8}
        >
          <Feather name="mic" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.instructionText}>
          {isRecording ? "Listening... Release to send" : "Hold to Speak in English"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFFFFF' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  chatArea: { padding: 20, paddingBottom: 100 },
  aiBubble: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderBottomLeftRadius: 0, marginBottom: 16, maxWidth: '85%', alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  aiText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  userBubble: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 16, borderBottomRightRadius: 0, marginBottom: 16, maxWidth: '85%', alignSelf: 'flex-end' },
  userText: { fontSize: 15, color: '#FFFFFF', lineHeight: 22 },
  processingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', padding: 12, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 16 },
  processingText: { marginLeft: 8, color: '#4B5563', fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32, alignItems: 'center', backgroundColor: 'transparent' },
  micButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  micButtonRecording: { backgroundColor: '#EF4444', transform: [{ scale: 1.1 }] },
  instructionText: { marginTop: 16, color: '#6B7280', fontSize: 14, fontWeight: '500', textAlign: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, borderRadius: 8, overflow: 'hidden' }
});
