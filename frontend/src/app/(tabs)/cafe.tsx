import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const RANDOM_TOPICS = [
  "Do you think AI will replace software engineers?",
  "Work from Home vs Office: Which is better for freshers?",
  "Is college degree still important for IT jobs?",
  "Social Media: A boon or a curse for students?",
  "If you had 1 million dollars, what startup would you build?",
  "Describe your dream job in 2 minutes.",
  "React vs Angular: Tell me your thoughts.",
  "What is the biggest challenge for beginners in coding?"
];

export default function CafeChatScreen() {
  const router = useRouter();
  const [currentTopic, setCurrentTopic] = useState("Tap the button below to get a topic!");

  const generateRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_TOPICS.length);
    setCurrentTopic(RANDOM_TOPICS[randomIndex]);
  };

  const startDebate = () => {
    // Navigate to the AI Tutor with 'general' scenario
    router.push('/chat');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cafe Chat ☕</Text>
        <Text style={styles.headerSub}>Random English Speaking Practice</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Feather name="info" size={24} color="#8B5CF6" />
          <Text style={styles.infoText}>
            Fluency comes from speaking without preparation. Get a random topic, start the AI mic, and try speaking continuously for 1 minute!
          </Text>
        </View>

        <View style={styles.topicCard}>
          <Text style={styles.topicLabel}>Your Topic Is:</Text>
          <Text style={styles.topicText}>{currentTopic}</Text>
        </View>

        <TouchableOpacity style={styles.generateButton} onPress={generateRandomTopic}>
          <Feather name="refresh-cw" size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>Get New Topic</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.debateButton, currentTopic.startsWith("Tap") ? {opacity: 0.5} : {}]} 
          onPress={startDebate}
          disabled={currentTopic.startsWith("Tap")}
        >
          <Feather name="mic" size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>Debate with AI Tutor</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center'
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  
  content: { padding: 20, alignItems: 'center' },
  
  infoCard: {
    flexDirection: 'row', backgroundColor: '#F5F3FF', padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#DDD6FE', marginBottom: 24, alignItems: 'center'
  },
  infoText: { flex: 1, fontSize: 13, color: '#5B21B6', marginLeft: 12, lineHeight: 20 },
  
  topicCard: {
    backgroundColor: '#FFFFFF', width: '100%', padding: 32, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', minHeight: 200,
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    marginBottom: 32, borderWidth: 2, borderColor: '#F1F5F9'
  },
  topicLabel: { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginBottom: 16, textTransform: 'uppercase' },
  topicText: { fontSize: 24, fontWeight: '800', color: '#1E293B', textAlign: 'center', lineHeight: 32 },
  
  generateButton: {
    flexDirection: 'row', backgroundColor: '#10B981', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 99, alignItems: 'center', marginBottom: 16, width: '90%', justifyContent: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  generateButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  
  debateButton: {
    flexDirection: 'row', backgroundColor: '#8B5CF6', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 99, alignItems: 'center', width: '90%', justifyContent: 'center',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  }
});
