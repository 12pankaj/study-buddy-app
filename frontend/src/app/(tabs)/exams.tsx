import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/api';

export default function ExamsScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetGoal, setTargetGoal] = useState('');

  useEffect(() => {
    fetchSyllabus();
  }, []);

  const fetchSyllabus = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const profile = await apiFetch(`/user/profile/${userId}`);
      const goal = profile?.target_goals?.[0] || 'RPSC Programmer';
      setTargetGoal(goal);

      const syllabusData = await apiFetch(`/exam/syllabus/${encodeURIComponent(goal)}`);
      // Attach mock progress logic
      const subjectsWithProgress = syllabusData.map((sub: any, index: number) => ({
        ...sub,
        progress: index === 0 ? 80 : Math.floor(Math.random() * 50) + 10 // Mock progress
      }));
      setSubjects(subjectsWithProgress);
    } catch (e) {
      console.log('Error fetching syllabus', e);
    } finally {
      setLoading(false);
    }
  };

  const openMockTest = (subjectId: number, subjectName: string) => {
    router.push({ pathname: '/mock-test', params: { subjectId, subjectName } });
  };

  if (loading) {
    return <SafeAreaView style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" color="#10B981" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{targetGoal} Syllabus 📝</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mock Exam Dashboard */}
        <View style={styles.topCard}>
          <Text style={styles.topCardTitle}>Overall Progress</Text>
          <Text style={styles.topCardPercentage}>41% Complete</Text>
        </View>

        <Text style={styles.sectionTitle}>Syllabus Modules</Text>
        
        {subjects.map((sub, idx) => (
          <View key={sub.id} style={styles.subjectCard}>
            <View style={styles.subjectIcon}>
              <Feather name="book" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>{sub.subject_name}</Text>
              <Text style={styles.weightageText}>Weightage: {sub.weightage}%</Text>
            </View>
            <View style={styles.actionContainer}>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{sub.progress}%</Text>
              </View>
              <TouchableOpacity style={styles.startButton} onPress={() => openMockTest(sub.id, sub.subject_name)}>
                <Text style={styles.startButtonText}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  scrollContent: { padding: 20 },
  topCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  topCardTitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  topCardPercentage: { color: '#10B981', fontSize: 24, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  subjectCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  subjectIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: '600', color: '#374151' },
  weightageText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  actionContainer: { alignItems: 'flex-end' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  startButton: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  startButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }
});
