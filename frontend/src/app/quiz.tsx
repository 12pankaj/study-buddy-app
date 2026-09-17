import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../utils/api';

export default function QuizScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const data = await apiFetch(`/course/quizzes/${lessonId}`);
      if (data && data.length > 0) {
        setQuizzes(data);
      } else {
        Alert.alert('Info', 'No questions available for this lesson.');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load test questions.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (selectedOption: string) => {
    const currentQ = quizzes[currentIndex];
    
    if (selectedOption === currentQ.correct_answer) {
      setScore(score + 10);
    } else {
      setMistakes([...mistakes, { 
        question: currentQ.question, 
        userAnswer: selectedOption, 
        correctAnswer: currentQ.correct_answer 
      }]);
    }

    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setShowResults(true);
    // Submit score to backend
    try {
      await apiFetch('/course/submit', {
        method: 'POST',
        body: JSON.stringify({ userId: 1, lessonId: parseInt(lessonId), score }) // hardcoded userId for now
      });

      if (mistakes.length > 0) {
        setAnalyzing(true);
        const data = await apiFetch('/course/analyze-mistakes', {
          method: 'POST',
          body: JSON.stringify({ mistakes })
        });
        setAiFeedback(data.feedback);
        setAnalyzing(false);
      }
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </SafeAreaView>
    );
  }

  if (showResults) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Completed! 🎉</Text>
          <Text style={styles.scoreText}>Your Score: {score}</Text>

          {mistakes.length > 0 ? (
            <View style={styles.aiFeedbackContainer}>
              <Text style={styles.aiTitle}>🤖 AI Feedback on Mistakes</Text>
              {analyzing ? (
                <ActivityIndicator color="#8B5CF6" />
              ) : (
                <Text style={styles.aiFeedbackText}>{aiFeedback}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.perfectScore}>Perfect! No mistakes made. 🌟</Text>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Back to Course</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentQ = quizzes[currentIndex];
  let options = [];
  try {
    options = JSON.parse(currentQ.options);
  } catch(e) {}

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progressText}>Question {currentIndex + 1} of {quizzes.length}</Text>
        <Text style={styles.liveScore}>Score: {score}</Text>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQ.question}</Text>

        <View style={styles.optionsContainer}>
          {options.map((opt: string, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.optionButton}
              onPress={() => handleAnswer(opt)}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF'
  },
  progressText: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
  liveScore: { fontSize: 16, fontWeight: 'bold', color: '#14B8A6' },
  questionContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  questionText: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 40, textAlign: 'center', lineHeight: 32 },
  optionsContainer: { gap: 16 },
  optionButton: {
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB',
    borderRadius: 16, padding: 20, alignItems: 'center'
  },
  optionText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  resultsContainer: { padding: 20, alignItems: 'center', paddingTop: 60 },
  resultsTitle: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 20 },
  scoreText: { fontSize: 24, fontWeight: 'bold', color: '#14B8A6', marginBottom: 40 },
  aiFeedbackContainer: { backgroundColor: '#F3E8FF', padding: 20, borderRadius: 16, width: '100%', marginBottom: 40 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', color: '#6D28D9', marginBottom: 12 },
  aiFeedbackText: { fontSize: 16, color: '#4C1D95', lineHeight: 24 },
  perfectScore: { fontSize: 18, fontWeight: 'bold', color: '#10B981', marginBottom: 40 },
  doneButton: { backgroundColor: '#111827', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16 },
  doneButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
