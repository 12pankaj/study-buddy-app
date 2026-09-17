import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../utils/api';
// We will integrate GoogleSignin later once the package is configured
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      const profileSetupDone = await AsyncStorage.getItem('profileSetupDone');
      if (profileSetupDone) {
        router.replace('/(tabs)');
      } else {
        router.replace('/profile-setup');
      }
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      setLoading(false);
      // Navigate to OTP screen and pass the email
      router.push({ pathname: '/verify-otp', params: { email: email.toLowerCase() } });
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>StudyBuddy✨</Text>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Unlock your learning journey today.</Text>
        </View>

        {/* Input Section */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. hello@studybuddy.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp}>
            <Text style={styles.primaryButtonText}>Send OTP</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Auth */}
        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8B5CF6', // Vibrant Purple
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  primaryButton: {
    height: 56,
    backgroundColor: '#14B8A6', // Vibrant Teal
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  socialContainer: {
    alignItems: 'center',
  },
  socialButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  }
});
