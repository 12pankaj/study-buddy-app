import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../utils/api';

export default function MockTestScreen() {
  const { subjectId, subjectName } = useLocalSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [subjectId]);

  const fetchTest = async () => {
    try {
      const data = await apiFetch(`/exam/mock-test/${subjectId}`);
      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        Alert.alert('No Questions', 'No questions available for this module yet.');
        router.back();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load test');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === questions[currentIdx].correct_answer;
    if (isCorrect) setScore(score + 1);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setFinished(true);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#8B5CF6" /></SafeAreaView>;
  }

  if (finished) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.finishTitle}>Test Complete! 🎉</Text>
        <Text style={styles.scoreText}>You scored {score} out of {questions.length}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{subjectName} - Q{currentIdx + 1}/{questions.length}</Text>
        <Text style={styles.scoreHeader}>Score: {score}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.questionText}>{currentQ.question}</Text>
        
        {currentQ.is_pyq && (
          <View style={styles.pyqBadge}>
            <Text style={styles.pyqText}>Previous Year Question 🔥</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          {currentQ.options_json.map((option: string, idx: number) => {
            let bgColor = '#FFFFFF';
            let borderColor = '#D1D5DB';
            let textColor = '#374151';

            if (isAnswered) {
              if (option === currentQ.correct_answer) {
                bgColor = '#D1FAE5';
                borderColor = '#10B981';
                textColor = '#065F46';
              } else if (option === selectedOption) {
                bgColor = '#FEE2E2';
                borderColor = '#EF4444';
                textColor = '#991B1B';
              }
            }

            return (
              <TouchableOpacity 
                key={idx}
                style={[styles.optionCard, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleSelect(option)}
                activeOpacity={isAnswered ? 1 : 0.7}
              >
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isAnswered && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>Explanation</Text>
            <Text style={styles.explanationText}>{currentQ.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {isAnswered && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
            <Text style={styles.nextButtonText}>
              {currentIdx === questions.length - 1 ? 'Finish Test' : 'Next Question'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  scoreHeader: { fontSize: 16, fontWeight: 'bold', color: '#8B5CF6' },
  content: { padding: 20 },
  questionText: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16, lineHeight: 28 },
  pyqBadge: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 20 },
  pyqText: { color: '#B45309', fontSize: 12, fontWeight: 'bold' },
  optionsContainer: { gap: 12 },
  optionCard: { padding: 16, borderRadius: 12, borderWidth: 2 },
  optionText: { fontSize: 16, fontWeight: '500' },
  explanationBox: { marginTop: 24, padding: 16, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  explanationTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E40AF', marginBottom: 8 },
  explanationText: { fontSize: 14, color: '#1E3A8A', lineHeight: 22 },
  footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  nextButton: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  finishTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  scoreText: { fontSize: 18, color: '#6B7280', marginBottom: 32 },
  backButton: { backgroundColor: '#111827', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
