import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/api';

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [dailyPlan, setDailyPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        // Fetch profile
        const profileData = await apiFetch(`/user/profile/${userId}`);
        setProfile(profileData);
        
        // Fetch AI Daily Plan
        const planData = await apiFetch('/ai/daily-plan', {
          method: 'POST',
          body: JSON.stringify({ userId: parseInt(userId) }),
        });
        setDailyPlan(planData || []);
      }
    } catch (e) {
      console.log('Error fetching data', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" color="#8B5CF6" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Day, {profile?.name?.split(' ')[0] || 'Pankaj'} 👋</Text>
            <Text style={styles.subGreeting}>Ready to speak fluent English today?</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.name?.[0] || 'P'}</Text>
          </TouchableOpacity>
        </View>

        {/* English Fluency Hero Banner */}
        <TouchableOpacity style={styles.aiHeroBanner} onPress={() => router.push('/chat')} activeOpacity={0.9}>
          <View style={styles.aiHeroContent}>
            <View style={styles.aiHeroTag}>
              <Text style={styles.aiHeroTagText}>✨ AI ENGLISH TUTOR</Text>
            </View>
            <Text style={styles.aiHeroTitle}>Spoken English Coach</Text>
            <Text style={styles.aiHeroDesc}>Hold mic to speak. AI listens, corrects grammar & talks back in English!</Text>
            <View style={styles.aiHeroButton}>
              <Feather name="mic" size={16} color="#FFFFFF" />
              <Text style={styles.aiHeroButtonText}>Start Speaking Now</Text>
            </View>
          </View>
          <Text style={styles.aiHeroEmoji}>🎙️</Text>
        </TouchableOpacity>

        {/* Target Card */}
        <View style={styles.targetCard}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressText}>75%</Text>
          </View>
          <View style={styles.targetInfo}>
            <Text style={styles.targetTitle}>{profile?.target_goals?.[0] || 'Fluent English & IT Career'}</Text>
            <Text style={styles.targetSubtitle}>Goal: Speak English with 100% confidence</Text>
          </View>
        </View>

        {/* Streaks */}
        <View style={styles.streakRow}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>Day 1 Streak</Text>
          </View>
          <TouchableOpacity style={styles.streakBadge} onPress={() => router.push('/chat')}>
            <Text style={styles.streakIcon}>🎙️</Text>
            <Text style={styles.streakText}>Daily Voice Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(tabs)/learn')}>
            <Feather name="book-open" size={24} color="#3B82F6" />
            <Text style={styles.linkText}>Course</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(tabs)/exams')}>
            <Feather name="edit-3" size={24} color="#8B5CF6" />
            <Text style={styles.linkText}>Exams</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(tabs)/jobs')}>
            <Feather name="briefcase" size={24} color="#10B981" />
            <Text style={styles.linkText}>Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkButton, styles.aiLinkButton]} onPress={() => router.push('/chat')}>
            <Feather name="message-circle" size={24} color="#8B5CF6" />
            <Text style={[styles.linkText, { color: '#8B5CF6', fontWeight: 'bold' }]}>AI Tutor</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Plan */}
        <Text style={styles.sectionTitle}>Today's English Plan (AI Personalized)</Text>
        <View style={styles.planCard}>
          {dailyPlan.length > 0 ? (
            dailyPlan.map((task, idx) => (
              <TouchableOpacity key={idx} style={[styles.planItem, idx === dailyPlan.length - 1 && { borderBottomWidth: 0 }]} onPress={() => router.push('/chat')}>
                <Text style={styles.planIcon}>{task.icon || '📝'}</Text>
                <View style={{flex: 1}}>
                  <Text style={styles.planItemTitle}>{task.title}</Text>
                </View>
                <Text style={styles.planItemTime}>{task.time}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{textAlign: 'center', color: '#6B7280', padding: 10}}>Generating your English speaking plan...</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subGreeting: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  
  aiHeroBanner: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  aiHeroContent: { flex: 1, paddingRight: 12 },
  aiHeroTag: { backgroundColor: 'rgba(255, 255, 255, 0.25)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  aiHeroTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  aiHeroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  aiHeroDesc: { color: '#EDE9FE', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  aiHeroButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  aiHeroButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
  aiHeroEmoji: { fontSize: 44 },
  aiLinkButton: { borderWidth: 1.5, borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },

  targetCard: { 
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, 
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  progressCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  progressText: { fontSize: 16, fontWeight: 'bold', color: '#3B82F6' },
  targetInfo: { flex: 1 },
  targetTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  targetSubtitle: { fontSize: 14, color: '#6B7280' },

  streakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  streakBadge: { flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  streakIcon: { fontSize: 18, marginRight: 8 },
  streakText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  quickLinks: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  linkButton: { alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, width: '22%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  linkText: { fontSize: 12, fontWeight: '500', color: '#374151', marginTop: 8 },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  planCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  planItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  planIcon: { fontSize: 24, marginRight: 12 },
  planItemTitle: { fontSize: 16, fontWeight: '500', color: '#374151' },
  planItemTime: { fontSize: 14, color: '#10B981', fontWeight: '600' }
});
