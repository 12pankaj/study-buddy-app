import { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../utils/api';

// Safe Google Sign-In setup
let GoogleSignin: any = null;
try {
  const gSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gSigninModule.GoogleSignin;
  if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
    GoogleSignin.configure({
      webClientId: '1084293849182-mockclientid.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }
} catch (e) {
  console.log('GoogleSignin module optional load notice:', e);
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Check existing session
    AsyncStorage.getItem('userId').then((id: string | null) => {
      if (id) {
        AsyncStorage.getItem('profileSetupDone').then((done) => {
          if (done) router.replace('/(tabs)');
          else router.replace('/profile-setup');
        });
      }
    });
  }, []);

  // 1. Instant Quick Start for immediate English learning
  const handleQuickStart = async () => {
    try {
      await AsyncStorage.setItem('userId', '1');
      await AsyncStorage.setItem('profileSetupDone', 'true');
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  };

  // 2. Verified Google Login Flow (Strict ID Token verification)
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      if (!GoogleSignin) {
        Alert.alert(
          'Google Sign-In Unavailable',
          'Google Sign-In requires native Google Play Services. Please use Email OTP or Instant Practice to log in.'
        );
        return;
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || (userInfo as any)?.idToken;

      if (!idToken) {
        throw new Error('No Google ID Token returned by Google Services.');
      }

      // Send cryptographic idToken to backend for verification
      const response = await apiFetch('/user/google-auth', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      });

      if (response && (response.id || response.user?.id)) {
        const userId = (response.id || response.user?.id).toString();
        const userEmail = response.email || response.user?.email || '';
        await AsyncStorage.setItem('userId', userId);
        if (userEmail) await AsyncStorage.setItem('userEmail', userEmail);
        
        const targetGoals = response.target_goals || response.user?.target_goals;
        if (!targetGoals) {
          router.replace('/profile-setup');
        } else {
          await AsyncStorage.setItem('profileSetupDone', 'true');
          router.replace('/(tabs)');
        }
      } else {
        throw new Error('Failed to authenticate Google token with server.');
      }
    } catch (error: any) {
      console.log('Google Sign-In Error:', error);
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(
          'Google Sign-In Notice',
          error?.message || 'Google Sign-In was cancelled or unavailable. You can log in securely using Email OTP below.'
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 3. Email OTP Login Flow
  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      setLoading(false);
      router.push({ pathname: '/verify-otp', params: { email: email.trim().toLowerCase() } });
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Study Buddy AI ✨</Text>
          <Text style={styles.subtitle}>Your AI Coach for English Fluency & IT Exams</Text>
          
          <View style={styles.illustrationPlaceholder}>
            <Text style={{ fontSize: 44 }}>🎙️📚</Text>
            <Text style={styles.badgeText}>Interactive English & Mock Tests</Text>
          </View>

          {/* Quick Start (Zero Friction) */}
          <TouchableOpacity 
            style={styles.quickStartButton} 
            onPress={handleQuickStart}
          >
            <Text style={styles.quickStartButtonText}>🚀 Instant English Practice</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email OTP Section */}
          <View style={styles.emailContainer}>
            <TextInput 
              style={styles.input} 
              placeholder="Enter your email" 
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity 
              style={styles.emailButton} 
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.emailButtonText}>Send OTP Code 📩</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Google Login Section */}
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google 🌐</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 28 },
  illustrationPlaceholder: { 
    width: 140, height: 140, backgroundColor: '#EEF2FF', 
    borderRadius: 70, justifyContent: 'center', alignItems: 'center', 
    marginBottom: 28, borderWidth: 2, borderColor: '#C7D2FE' 
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#4F46E5', marginTop: 4, textAlign: 'center' },
  quickStartButton: { 
    backgroundColor: '#8B5CF6', paddingVertical: 15, paddingHorizontal: 24, 
    borderRadius: 16, width: '100%', alignItems: 'center', marginBottom: 20, 
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 
  },
  quickStartButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  emailContainer: { width: '100%', marginBottom: 16 },
  input: { 
    width: '100%', height: 50, backgroundColor: '#FFFFFF', 
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, 
    paddingHorizontal: 16, fontSize: 15, color: '#111827', marginBottom: 10 
  },
  emailButton: { 
    width: '100%', height: 48, backgroundColor: '#14B8A6', 
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2
  },
  emailButtonText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  googleButton: { 
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB', 
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, 
    width: '100%', alignItems: 'center', shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 
  },
  googleButtonText: { fontSize: 15, fontWeight: '700', color: '#374151' }
});
