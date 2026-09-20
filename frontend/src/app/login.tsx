import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/api';
import { useEffect } from 'react';

// NOTE: User needs to put their Web Client ID here
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com', 
});

export default function LoginScreen() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Check if already logged in to skip this screen
    AsyncStorage.getItem('userId').then(id => {
      if (id) router.replace('/(tabs)');
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const user = userInfo.user;

      // Send to backend
      const response = await apiFetch('/user/google-auth', {
        method: 'POST',
        body: JSON.stringify({
          google_id: user.id,
          email: user.email,
          name: user.name || 'User'
        })
      });

      if (response && response.id) {
        await AsyncStorage.setItem('userId', response.id.toString());
        if (!response.target_goals) {
          router.replace('/profile-setup');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.log('Google Sign-In Error:', error);
      Alert.alert('Login Failed', 'Could not sign in with Google. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Study Buddy AI</Text>
        <Text style={styles.subtitle}>Your AI Powered Coach for Govt & IT Exams</Text>
        
        <View style={styles.illustrationPlaceholder}>
          <Text style={{color: '#9CA3AF'}}>✨ App Illustration ✨</Text>
        </View>

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
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  googleButtonText: { fontSize: 16, fontWeight: 'bold', color: '#374151' }
});
