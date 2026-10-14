import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../utils/api';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlockedIndex, setUnlockedIndex] = useState(0);

  useEffect(() => {
    fetchLesson();
  }, []);

  const fetchLesson = async () => {
    try {
      const data = await apiFetch(`/course/lesson/${id}`);
      setLesson(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load lesson content.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockNext = () => {
    if (lesson?.sections && unlockedIndex < lesson.sections.length - 1) {
      setUnlockedIndex(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Mode 📖</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>{lesson?.title}</Text>
        
        {lesson?.sections && lesson.sections.length > 0 ? (
          <>
            {lesson.sections.slice(0, unlockedIndex + 1).map((sec: any, index: number) => (
              <View key={index} style={styles.markdownContainer}>
                <Text style={styles.sectionBadge}>{sec.section_type.replace(/_/g, ' ')}</Text>
                <Text style={styles.bodyText}>{sec.content_markdown}</Text>
              </View>
            ))}

            {unlockedIndex < lesson.sections.length - 1 && (
              <TouchableOpacity style={styles.unlockButton} onPress={handleUnlockNext}>
                <Text style={styles.unlockButtonText}>Tap to Reveal Next Concept 🔓</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.markdownContainer}>
            <Text style={styles.bodyText}>Generating deep knowledge from AI... Please refresh soon.</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer / Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.examButton} onPress={() => Alert.alert('Coming Soon', 'Advanced Deep Assessments are being integrated!')}>
          <Text style={styles.examButtonText}>Start Assessment ✍️</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 24, color: '#374151' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  content: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#8B5CF6', marginBottom: 24 },
  markdownContainer: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  sectionBadge: {
    backgroundColor: '#EEF2FF', color: '#4F46E5', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    fontSize: 12, fontWeight: 'bold', marginBottom: 12, overflow: 'hidden'
  },
  bodyText: { fontSize: 16, lineHeight: 28, color: '#374151' },
  footer: { padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  examButton: {
    backgroundColor: '#14B8A6', borderRadius: 16, paddingVertical: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  examButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  unlockButton: {
    backgroundColor: '#F5F3FF', borderColor: '#8B5CF6', borderWidth: 1.5, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 16, marginTop: 10, marginBottom: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  unlockButtonText: { color: '#8B5CF6', fontSize: 16, fontWeight: '800' }
});
