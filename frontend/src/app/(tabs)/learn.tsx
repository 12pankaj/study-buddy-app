import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../utils/api';

export default function CourseScreen() {
  const router = useRouter();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const data = await apiFetch('/course/lessons');
      setLessons(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const openLesson = (lessonId: number) => {
    router.push({ pathname: '/lesson', params: { id: lessonId } });
  };

  const renderLessonCard = ({ item, index }: { item: any, index: number }) => (
    <TouchableOpacity 
      style={styles.lessonCard} 
      onPress={() => openLesson(item.id)}
    >
      <View style={styles.lessonNumber}>
        <Text style={styles.lessonNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonDesc} numberOfLines={2}>{item.description}</Text>
      </View>
      <View style={styles.playButton}>
        <Text style={styles.playButtonText}>▶</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>English Course 📚</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={lessons}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLessonCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No lessons found. Run backend to seed.</Text>}
          />
        )}
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
  listContainer: { padding: 20 },
  lessonCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 2, borderColor: '#F3F4F6',
  },
  lessonNumber: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  lessonNumberText: { fontSize: 18, fontWeight: '900', color: '#4B5563' },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  lessonDesc: { fontSize: 14, color: '#6B7280' },
  playButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  playButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 4 }
});
