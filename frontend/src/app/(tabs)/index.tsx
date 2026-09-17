import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/api';

export default function HomeScreen() {
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
            <Text style={styles.greeting}>Good Morning, {profile?.name?.split(' ')[0] || 'Learner'} 👋</Text>
            <Text style={styles.subGreeting}>Keep going! Your hard work will pay off.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.name?.[0] || 'U'}</Text>
          </View>
        </View>

        {/* Target Card */}
        <View style={styles.targetCard}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressText}>0%</Text>
          </View>
          <View style={styles.targetInfo}>
            <Text style={styles.targetTitle}>{profile?.target_goals?.[0] || 'Set your Goal'}</Text>
            <Text style={styles.targetSubtitle}>Target Exam / Job</Text>
          </View>
        </View>

        {/* Streaks */}
        <View style={styles.streakRow}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>1 Day Streak</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>⏱️</Text>
            <Text style={styles.streakText}>0m Study Today</Text>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.linkButton}>
            <Feather name="book-open" size={24} color="#3B82F6" />
            <Text style={styles.linkText}>Learn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton}>
            <Feather name="edit-3" size={24} color="#8B5CF6" />
            <Text style={styles.linkText}>Exams</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton}>
            <Feather name="briefcase" size={24} color="#10B981" />
            <Text style={styles.linkText}>Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton}>
            <Feather name="message-circle" size={24} color="#F59E0B" />
            <Text style={styles.linkText}>AI Coach</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Plan */}
        <Text style={styles.sectionTitle}>Today's Plan (AI Generated)</Text>
        <View style={styles.planCard}>
          {dailyPlan.length > 0 ? (
            dailyPlan.map((task, idx) => (
              <View key={idx} style={[styles.planItem, idx === dailyPlan.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.planIcon}>{task.icon || '📝'}</Text>
                <View style={{flex: 1}}>
                  <Text style={styles.planItemTitle}>{task.title}</Text>
                </View>
                <Text style={styles.planItemTime}>{task.time}</Text>
              </View>
            ))
          ) : (
            <Text style={{textAlign: 'center', color: '#6B7280', padding: 10}}>Generating your plan...</Text>
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
