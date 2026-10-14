import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/api';
import { useEffect } from 'react';

export default function LoginScreen() {
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in to skip this screen
    AsyncStorage.getItem('userId').then((id: string | null) => {
      if (id) router.replace('/(tabs)');
    });
  }, []);

  const handleQuickStart = async () => {
    try {
      await AsyncStorage.setItem('userId', '1');
      await AsyncStorage.setItem('profileSetupDone', 'true');
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert('Coming Soon', 'Google Sign-In requires a custom dev client. Please use "Start Learning English" for now!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Study Buddy AI</Text>
        <Text style={styles.subtitle}>Your AI Powered Coach for English Fluency & Exams</Text>
        
        <View style={styles.illustrationPlaceholder}>
          <Text style={{fontSize: 50}}>🎙️✨</Text>
          <Text style={{color: '#6B7280', marginTop: 8, fontWeight: '600'}}>English AI Tutor</Text>
        </View>

        <TouchableOpacity style={styles.quickStartButton} onPress={handleQuickStart}>
          <Text style={styles.quickStartButtonText}>🚀 Start Learning English (Instant)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, justifyContent: 'center', padding: 32, alignItems: 'center' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 48 },
  illustrationPlaceholder: { width: 200, height: 200, backgroundColor: '#E5E7EB', borderRadius: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 48 },
  quickStartButton: { backgroundColor: '#8B5CF6', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 32, width: '100%', alignItems: 'center', marginBottom: 16, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  quickStartButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  googleButtonText: { fontSize: 16, fontWeight: 'bold', color: '#374151' }
});
