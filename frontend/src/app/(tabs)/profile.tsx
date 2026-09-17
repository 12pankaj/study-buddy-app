import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  const openAICoach = () => {
    router.push('/chat');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      <View style={styles.content}>
        {/* AI Coach Special Action */}
        <TouchableOpacity style={styles.aiCard} onPress={openAICoach}>
          <View style={styles.aiIconContainer}>
            <Text style={styles.aiIcon}>🤖</Text>
          </View>
          <View style={styles.aiInfo}>
            <Text style={styles.aiTitle}>My AI Coach</Text>
            <Text style={styles.aiSubtitle}>Chat for Interview practice & Doubts</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="pie-chart" size={20} color="#6B7280" />
            <Text style={styles.menuText}>My Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="calendar" size={20} color="#6B7280" />
            <Text style={styles.menuText}>Study Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="file-text" size={20} color="#6B7280" />
            <Text style={styles.menuText}>My Resume (Coming Soon)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#EF4444" />
            <Text style={[styles.menuText, {color: '#EF4444'}]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20 },
  aiCard: { flexDirection: 'row', backgroundColor: '#8B5CF6', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 32, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  aiIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  aiIcon: { fontSize: 24 },
  aiInfo: { flex: 1 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  aiSubtitle: { fontSize: 13, color: '#E5E7EB' },
  menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuText: { fontSize: 16, fontWeight: '500', color: '#374151', marginLeft: 16 }
});
