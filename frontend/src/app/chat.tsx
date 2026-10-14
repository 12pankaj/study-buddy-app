import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';

// Safe imports for native modules
let Audio: any = null;
let Speech: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) { console.log('expo-av missing'); }
try {
  Speech = require('expo-speech');
} catch (e) { console.log('expo-speech missing'); }
import { apiFetch } from '../utils/api';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  feedback?: string;
  isAudio?: boolean;
}

const SCENARIOS = [
  { id: 'general', label: '🎯 Daily Chat', desc: 'Free conversational practice' },
  { id: 'interview', label: '💼 IT Interview', desc: 'Tech & HR mock interview' },
  { id: 'office', label: '🏢 Office English', desc: 'Emails, meetings & presentation' },
  { id: 'pronunciation', label: '🗣️ Pronunciation', desc: 'Accent & word clarity' },
];

const PROMPT_SUGGESTIONS = [
  "How should I introduce myself in an IT interview?",
  "Can you correct this: 'I am having 3 years experience'?",
  "Ask me a question about Database or SQL in English.",
  "Let's practice ordering coffee in a restaurant."
];

export default function VoiceChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [scenario, setScenario] = useState('general');
  const [recording, setRecording] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: "Hello Pankaj! I am your AI English Fluency Coach. Speak into the microphone or type below. I will correct your grammar and teach you to speak like a native!",
    }
  ]);

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      try {
        if (Audio) {
          await Audio.requestPermissionsAsync();
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
        }
      } catch (err) {
        console.warn('Audio permission error', err);
      }
    })();

    return () => {
      if (Speech) Speech.stop();
    };
  }, []);

  const speakText = (text: string) => {
    if (!Speech) return;
    Speech.stop();
    setIsSpeaking(true);
    // Remove coach notes from speech if any, speak only clean reply
    const cleanSpeech = text.replace(/Coach Note:[\s\S]*?\n\n/g, '').trim();
    Speech.speak(cleanSpeech, {
      language: 'en-US',
      rate: 0.9,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    if (Speech) Speech.stop();
    setIsSpeaking(false);
  };

  const startRecording = async () => {
    try {
      if (processing) return;
      if (!Audio) {
        Alert.alert('Unsupported', 'Voice recording is not supported on this device.');
        return;
      }
      stopSpeaking();
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
        const base64Audio = await FileSystem.readAsStringAsync(uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        
        // Send to backend
        const response = await apiFetch('/ai/speech', {
          method: 'POST',
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: 'audio/m4a',
            scenario: scenario
          })
        });

        if (response && response.reply) {
          const userTranscription = response.transcription || 'Voice recording';
          const feedback = response.feedback;
          const reply = response.reply;

          setMessages(prev => [
            ...prev,
            { role: 'user', text: userTranscription, isAudio: true },
            { role: 'model', text: reply, feedback: feedback !== 'Excellent speech! No errors found.' ? feedback : undefined }
          ]);

          speakText(reply);
        } else {
          throw new Error('Invalid response from AI');
        }
      }
    } catch (err: any) {
      console.error('Recording stop error', err);
      Alert.alert('Notice', 'Voice could not be processed. You can also type your message in English below!');
    } finally {
      setRecording(null);
      setProcessing(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSendText = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || processing) return;

    setInputText('');
    stopSpeaking();
    setProcessing(true);

    const updatedMessages = [...messages, { role: 'user' as const, text: message }];
    setMessages(updatedMessages);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message,
          history,
          scenario
        })
      });

      if (res && res.response) {
        setMessages(prev => [...prev, { role: 'model', text: res.response }]);
        speakText(res.response);
      }
    } catch (err: any) {
      console.error('Chat error', err);
      Alert.alert('Connection Notice', 'Could not connect to AI Tutor. Please verify the backend is running.');
    } finally {
      setProcessing(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>English AI Tutor 🎙️</Text>
            <Text style={styles.headerSub}>Real-Time Fluency Coaching</Text>
          </View>
          {isSpeaking ? (
            <TouchableOpacity onPress={stopSpeaking} style={styles.stopSpeechBtn}>
              <Feather name="volume-x" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Scenario Selector Pills */}
        <View style={styles.scenarioBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenarioScroll}>
            {SCENARIOS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.scenarioPill, scenario === s.id && styles.scenarioPillActive]}
                onPress={() => setScenario(s.id)}
              >
                <Text style={[styles.scenarioPillText, scenario === s.id && styles.scenarioPillTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Messages */}
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatArea}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => (
            <View key={idx} style={msg.role === 'user' ? styles.userBubbleContainer : styles.aiBubbleContainer}>
              <View style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                {msg.isAudio && (
                  <View style={styles.audioBadge}>
                    <Feather name="mic" size={12} color="#FFFFFF" />
                    <Text style={styles.audioBadgeText}>Spoken</Text>
                  </View>
                )}

                {msg.feedback && (
                  <View style={styles.feedbackBox}>
                    <View style={styles.feedbackHeader}>
                      <Feather name="check-circle" size={14} color="#10B981" />
                      <Text style={styles.feedbackHeaderText}>Coach Correction & Tips</Text>
                    </View>
                    <Text style={styles.feedbackText}>{msg.feedback}</Text>
                  </View>
                )}

                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                  {msg.text}
                </Text>

                {msg.role === 'model' && (
                  <TouchableOpacity style={styles.speakButton} onPress={() => speakText(msg.text)}>
                    <Feather name="volume-2" size={16} color="#8B5CF6" />
                    <Text style={styles.speakButtonText}>Listen</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Quick Prompt Suggestions when chat has few messages */}
          {messages.length <= 2 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeader}>💡 Try saying or asking:</Text>
              {PROMPT_SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.suggestionChip}
                  onPress={() => handleSendText(sug)}
                >
                  <Text style={styles.suggestionText}>"{sug}"</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {processing && (
            <View style={styles.processingBubble}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.processingText}>Tutor is analyzing your English & replying...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Bar: Text + Mic */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type in English or hold mic to speak..."
            value={inputText}
            onChangeText={setInputText}
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={() => handleSendText()}
            returnKeyType="send"
          />

          {inputText.trim().length > 0 ? (
            <TouchableOpacity style={styles.sendButton} onPress={() => handleSendText()}>
              <Feather name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.micMiniButton, isRecording && styles.micMiniButtonRecording]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.8}
            >
              <Feather name="mic" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Mic Instruction Toast */}
        <View style={styles.micHelperBar}>
          <Text style={styles.micHelperText}>
            {isRecording ? "🔴 Listening... Release when you finish speaking" : "🎙️ Press & Hold Mic button to Speak English"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  stopSpeechBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },

  scenarioBar: { backgroundColor: '#FFFFFF', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  scenarioScroll: { paddingHorizontal: 16 },
  scenarioPill: { 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9', 
    marginRight: 8 
  },
  scenarioPillActive: { backgroundColor: '#8B5CF6' },
  scenarioPillText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  scenarioPillTextActive: { color: '#FFFFFF' },

  chatArea: { padding: 16, paddingBottom: 24 },
  userBubbleContainer: { alignItems: 'flex-end', marginBottom: 16 },
  userBubble: { 
    backgroundColor: '#8B5CF6', 
    padding: 14, 
    borderRadius: 18, 
    borderBottomRightRadius: 4, 
    maxWidth: '85%' 
  },
  userText: { fontSize: 15, color: '#FFFFFF', lineHeight: 22 },
  audioBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  audioBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', marginLeft: 4 },

  aiBubbleContainer: { alignItems: 'flex-start', marginBottom: 16 },
  aiBubble: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 18, 
    borderBottomLeftRadius: 4, 
    maxWidth: '88%',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 4, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  aiText: { fontSize: 15, color: '#1E293B', lineHeight: 23 },

  feedbackBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  feedbackHeaderText: { fontSize: 12, fontWeight: '800', color: '#15803D', marginLeft: 6 },
  feedbackText: { fontSize: 13, color: '#166534', lineHeight: 18 },

  speakButton: { flexDirection: 'row', alignItems: 'center', marginTop: 10, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#F5F3FF' },
  speakButtonText: { fontSize: 12, fontWeight: '700', color: '#8B5CF6', marginLeft: 4 },

  suggestionsContainer: { marginTop: 8, marginBottom: 16 },
  suggestionsHeader: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  suggestionChip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, marginBottom: 8 },
  suggestionText: { fontSize: 13, color: '#334155', fontStyle: 'italic' },

  processingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', padding: 12, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 16 },
  processingText: { marginLeft: 8, color: '#6D28D9', fontSize: 13, fontWeight: '500' },

  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#0F172A',
    marginRight: 10,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micMiniButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  micMiniButtonRecording: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.15 }]
  },

  micHelperBar: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  micHelperText: { fontSize: 12, color: '#64748B', fontWeight: '600' }
});
