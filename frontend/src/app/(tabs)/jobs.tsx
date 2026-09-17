import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../utils/api';

export default function JobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await apiFetch('/jobs');
      // Backend returns raw jobs. Map to UI needed fields:
      const formattedJobs = data.map((job: any) => ({
        id: job.id,
        title: job.title,
        source: job.source,
        deadline: new Date(job.deadline).toLocaleDateString(),
        tagColor: job.source === 'RPSC' ? '#8B5CF6' : '#14B8A6'
      }));
      setJobs(formattedJobs);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch jobs. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderJobCard = ({ item }: { item: any }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={[styles.sourceBadge, { backgroundColor: item.tagColor }]}>
          <Text style={styles.sourceText}>{item.source}</Text>
        </View>
        <Text style={styles.deadlineText}>⏳ {item.deadline}</Text>
      </View>
      <Text style={styles.jobTitle}>{item.title}</Text>
      
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notifyButton}>
          <Text style={styles.notifyButtonText}>🔔 Remind Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IT Govt Jobs 🏢</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#14B8A6" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderJobCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#374151',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deadlineText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    lineHeight: 26,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#14B8A6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  notifyButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  notifyButtonText: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
