import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private readonly textModels = ['gemma-4-26b-a4b-it', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
  private readonly audioModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set in environment variables');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private getScenarioInstruction(scenario?: string): string {
    switch (scenario) {
      case 'interview':
        return `You are an expert IT & Corporate Job Interviewer and English Fluency Coach for Pankaj.
Conduct an English interview for Software/IT positions (or govt IT exams like RPSC Programmer).
Rules:
1. Ask one realistic interview question at a time.
2. When Pankaj answers, first evaluate his English: highlight grammar errors, awkward phrasing, and provide a professional, native-like alternative.
3. Then critique the substance of his answer and ask the next follow-up question.
4. Keep the tone encouraging, professional, and confidence-boosting.`;

      case 'office':
        return `You are a Workplace Communication Coach for Pankaj.
Help him master professional English for meetings, emails, client presentations, and team discussions.
Rules:
1. Correct any grammatical slip-ups or informal Hinglish habits.
2. Provide polite, assertive corporate alternatives.
3. Prompt him with realistic workplace situations to respond to.`;

      case 'pronunciation':
        return `You are a Pronunciation and Accent Specialist helping Indian English learners achieve clear, natural global English fluency.
Help Pankaj with vocabulary, clear articulation, idioms, and natural sentence rhythm.
Rules:
1. Point out words that are commonly mispronounced or misused in Indian English.
2. Give easy-to-remember phonetic tips and natural phrasing.
3. Keep answers concise, highly practical, and engaging.`;

      default:
        return `You are an expert English Fluency Coach. Your student's name is Pankaj, and his goal is to become strictly FLUENT in English for IT careers and daily conversations.
Rules:
1. Always reply in English to force him to read, listen, and speak English.
2. If he makes a grammatical, spelling, or phrasing mistake in his message, gently highlight it with:
   - "What you said"
   - "Better way to say it"
   - "Why"
3. Then answer his question or continue the conversation warmly and ask a follow-up question.
4. Be highly encouraging, energetic, and supportive.`;
    }
  }

  async chat(message: string, history: any[] = [], scenario?: string) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const systemInstruction = this.getScenarioInstruction(scenario);

    // Try text models in fallback order
    let lastError: any = null;
    for (const modelName of this.textModels) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        // Some models like Gemma do not support startChat with systemInstruction directly
        if (modelName.startsWith('gemini')) {
          const chatSession = model.startChat({ history: history || [] });
          const result = await chatSession.sendMessage(message);
          return { response: result.response.text(), modelUsed: modelName };
        } else {
          // Fallback to generateContent
          const conversationPrompt = `${systemInstruction}\n\nUser: ${message}\n\nCoach:`;
          const result = await model.generateContent(conversationPrompt);
          return { response: result.response.text(), modelUsed: modelName };
        }
      } catch (error: any) {
        this.logger.warn(`Model ${modelName} failed in chat: ${error?.message || error}. Trying next model...`);
        lastError = error;
      }
    }

    this.logger.error('All Gemini models failed in chat', lastError);
    throw new HttpException('Failed to generate response. Please try again in a few moments.', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async handleVoiceChat(audioBase64: string, mimeType: string, scenario?: string) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const scenarioContext = this.getScenarioInstruction(scenario);

    const prompt = `${scenarioContext}

The user has sent an audio voice recording speaking in English.
Task:
1. Transcribe exactly what the user said in the audio.
2. Provide constructive feedback on grammar, sentence structure, and vocabulary.
3. Provide your conversational response in English to keep the practice going.

Return your response in EXACTLY this JSON format (no extra text):
{
  "transcription": "exact words spoken by the user",
  "feedback": "constructive feedback on their English (or 'Excellent speech! No errors found.')",
  "reply": "your conversational English reply to continue speaking"
}`;

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType || 'audio/m4a'
      }
    };

    let lastError: any = null;
    for (const modelName of this.audioModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, audioPart]);
        let text = result.response.text().trim();

        if (text.startsWith('```json')) {
          text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
          text = text.substring(3, text.length - 3).trim();
        }

        const parsed = JSON.parse(text);
        return { ...parsed, modelUsed: modelName };
      } catch (error: any) {
        this.logger.warn(`Audio model ${modelName} failed: ${error?.message || error}. Trying next audio model...`);
        lastError = error;
      }
    }

    this.logger.error('Voice chat failed on all audio models', lastError);
    // Graceful fallback response instead of crash
    return {
      transcription: "Voice received",
      feedback: "Your voice message was received! Keep speaking with confidence. Tip: Focus on clear vowel sounds and speaking at a steady, calm pace.",
      reply: "Great effort speaking in English! Tell me: What did you work on or study today? Speak clearly into the microphone."
    };
  }

  async generateDailyPlan(profile: any) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const prompt = `You are an expert English Fluency and Exam Study Planner. Create a daily English-focused study plan for this user.
Profile:
Name: ${profile.name || 'Pankaj'}
Education: ${profile.education || 'IT Graduate'}
Target Goal: ${profile.target_goals ? profile.target_goals.join(', ') : 'RPSC Programmer & Fluent English'}
English Level: ${profile.english_level || 'Beginner to Intermediate'}

Return EXACTLY a valid JSON array of tasks (no markdown, no extra text):
[
  { "title": "Morning English Speaking with AI Tutor", "time": "15 min", "icon": "🎙️" },
  { "title": "Vocabulary & Grammar Expansion", "time": "20 min", "icon": "📚" },
  { "title": "IT Tech Interview Practice in English", "time": "25 min", "icon": "💼" }
]`;

    for (const modelName of this.textModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        if (text.startsWith('```json')) {
          text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
          text = text.substring(3, text.length - 3).trim();
        }

        return JSON.parse(text);
      } catch (error) {
        this.logger.warn(`Plan generation failed with ${modelName}, trying next...`);
      }
    }

    // Default high-quality fallback plan
    return [
      { title: "Daily English Speaking with AI Tutor", time: "15 min", icon: "🎙️" },
      { title: "English Grammar & Phrasing Drill", time: "20 min", icon: "📚" },
      { title: "Technical Subject Revision", time: "30 min", icon: "💻" },
      { title: "Evening Conversational English Roleplay", time: "15 min", icon: "🗣️" }
    ];
  }

  async generateStudyPlan(level: string, exam: string) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const prompt = `Generate a detailed 4-week adaptive English fluency & study plan for a student at '${level}' English proficiency, preparing for '${exam}'. Format the output in clean JSON with a list of weeks, each containing a list of daily topics.`;

    for (const modelName of this.textModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/```json([\s\S]*?)```/);
        const cleanJson = jsonMatch ? jsonMatch[1].trim() : text;
        return JSON.parse(cleanJson);
      } catch (error) {
        this.logger.warn(`Study plan failed on ${modelName}, trying next...`);
      }
    }

    return {
      weeks: [
        {
          week: 1,
          theme: "Foundation English & Self Introduction",
          topics: ["Greetings & Introductions", "Daily Routine in Simple Present", "Common IT Terminology in English"]
        },
        {
          week: 2,
          theme: "Conversational Confidence & Question Formation",
          topics: ["Asking & Answering Questions", "Past Experiences & Project Descriptions", "Pronunciation Essentials"]
        }
      ]
    };
  }

  async generateDeepKnowledge(subjectName: string, topicName: string): Promise<any> {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const prompt = `
      You are an expert ${subjectName} teacher. Create a Deep Knowledge Unit for the topic: "${topicName}".
      Return ONLY a valid JSON array of objects representing different sections of the lesson. Do not include markdown formatting or backticks outside the JSON.
      Required sections: DEEP_THEORY, CODE_EXAMPLE (or REAL_WORLD_EXAMPLE if not coding), COMMON_MISTAKES, SUMMARY.
      Format:
      [
        { "section_type": "DEEP_THEORY", "content_markdown": "Deep explanation..." },
        { "section_type": "CODE_EXAMPLE", "content_markdown": "Examples..." }
      ]
    `;

    for (const modelName of this.textModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        if (text.startsWith('```json')) {
          text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
          text = text.substring(3, text.length - 3).trim();
        }
        return JSON.parse(text);
      } catch (error) {
        this.logger.warn(`Deep Knowledge generation failed on ${modelName}, trying next...`);
      }
    }
    throw new HttpException('Failed to generate deep knowledge', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async generateTopicAssessments(subjectName: string, topicName: string): Promise<any[]> {
    if (!this.genAI) {
      return [
        {
          question: `What is the core principle behind ${topicName}?`,
          options: ['Fundamental design', 'Random operation', 'Deprecated behavior', 'None of the above'],
          correct_answer: 'Fundamental design',
          deep_explanation: `The core principle of ${topicName} ensures consistent architecture and performance.`
        }
      ];
    }

    const prompt = `
      You are an expert ${subjectName} exam creator. Generate 3 high-quality multiple choice assessment questions for the topic: "${topicName}".
      Return ONLY a valid JSON array of objects without markdown formatting or backticks outside the JSON.
      Format:
      [
        {
          "question": "Clear question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Option A",
          "deep_explanation": "Detailed explanation of why Option A is correct."
        }
      ]
    `;

    for (const modelName of this.textModels) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        if (text.startsWith('```json')) {
          text = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith('```')) {
          text = text.substring(3, text.length - 3).trim();
        }
        return JSON.parse(text);
      } catch (error) {
        this.logger.warn(`Assessment generation failed on ${modelName}, trying next...`);
      }
    }

    return [
      {
        question: `What is the primary role of ${topicName}?`,
        options: ['Core conceptual foundation', 'Secondary styling', 'Optional wrapper', 'None of these'],
        correct_answer: 'Core conceptual foundation',
        deep_explanation: `${topicName} provides key architectural capabilities.`
      }
    ];
  }
}

