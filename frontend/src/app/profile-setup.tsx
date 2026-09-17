import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [education, setEducation] = useState('');
  const [targetGoal, setTargetGoal] = useState('');
  const [englishLevel, setEnglishLevel] = useState('Beginner');
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!name || !education || !targetGoal) {
      Alert.alert('Missing Fields', 'Please fill in all details.');
      return;
    }
    
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'Session not found. Please log in again.');
        router.replace('/');
        return;
      }

      await apiFetch(`/user/profile/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          education,
          target_goals: [targetGoal], // Saving as array since user can have multiple
          english_level: englishLevel,
        }),
      });
      
      // Save setup flag locally to avoid showing this screen again
      await AsyncStorage.setItem('profileSetupDone', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>This helps us create your personalized learning plan</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Pankaj Kumar"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Highest Education</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MCA, B.Tech"
            value={education}
            onChangeText={setEducation}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Target Goal / Exam</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. RPSC Programmer OR Infosys"
            value={targetGoal}
            onChangeText={setTargetGoal}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Current English Level</Text>
          <View style={styles.levelButtons}>
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  englishLevel === level && styles.levelButtonActive
                ]}
                onPress={() => setEnglishLevel(level)}
              >
                <Text style={[
                  styles.levelButtonText,
                  englishLevel === level && styles.levelButtonTextActive
                ]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSaveProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 24, paddingTop: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280' },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB'
  },
  levelButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  levelButton: {
    flex: 1, paddingVertical: 12, marginHorizontal: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB',
    alignItems: 'center', backgroundColor: '#F9FAFB'
  },
  levelButtonActive: {
    backgroundColor: '#8B5CF6', borderColor: '#8B5CF6'
  },
  levelButtonText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  levelButtonTextActive: { color: '#FFFFFF' },
  button: {
    backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', marginTop: 12
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
