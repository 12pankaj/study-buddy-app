import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set in environment variables');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async chat(message: string, history: any[] = []) {
  async chat(message: string, history: any[] = []) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: `You are an expert English Fluency Coach. Your student's name is Pankaj, and he is preparing for IT Government jobs (like RPSC Programmer). His primary goal with you is to become strictly FLUENT in English.
        Rules:
        1. Always reply in English to force him to read and understand English, but use simple, clear words initially.
        2. If he makes a grammatical or spelling mistake in his prompt, gently point it out and correct him before answering.
        3. Keep the conversation engaging, ask follow-up questions to force him to reply.
        4. Occasionally simulate IT interview questions in English to build his confidence.
        5. Be highly encouraging but strict about his English practice.`
      });

      const chatSession = model.startChat({ history });
      const result = await chatSession.sendMessage(message);
      return { response: result.response.text() };
    } catch (error) {
      this.logger.error('Gemini Chat Error', error);
      throw new HttpException('Failed to generate response', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleVoiceChat(audioBase64: string, mimeType: string) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `You are an expert English Fluency Coach. The user has sent an audio message speaking in English.
      1. First, transcribe exactly what the user said.
      2. Second, gently point out any grammatical or pronunciation-related errors in their speech.
      3. Third, respond conversationally to continue the discussion in English, keeping it simple but engaging.
      
      Return your response in EXACTLY this JSON format:
      {
        "transcription": "what the user said",
        "feedback": "your feedback on their English",
        "reply": "your conversational reply"
      }`;

      const audioPart = {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType
        }
      };

      const result = await model.generateContent([prompt, audioPart]);
      let text = result.response.text().trim();
      
      // Clean up markdown json formatting if present
      if (text.startsWith('\`\`\`json')) {
        text = text.substring(7, text.length - 3).trim();
      } else if (text.startsWith('\`\`\`')) {
        text = text.substring(3, text.length - 3).trim();
      }

      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Voice Chat Error', error);
      throw new HttpException('Failed to process audio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generateDailyPlan(profile: any) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    const prompt = `You are an expert AI Study Planner. Create a daily study plan for this user.
    Profile:
    Name: ${profile.name || 'Student'}
    Education: ${profile.education || 'N/A'}
    Target Goal: ${profile.target_goals ? profile.target_goals.join(', ') : 'IT Exams'}
    English Level: ${profile.english_level || 'Beginner'}
    
    Return EXACTLY a valid JSON object with an array of tasks. Each task should have:
    - title (e.g. "English - Grammar Practice")
    - time (e.g. "20 min")
    - icon (a single emoji representing the task, e.g. "📚")
    
    Do not return any markdown formatting or extra text, ONLY the JSON array like this:
    [
      { "title": "English Grammar", "time": "20 min", "icon": "📚" },
      { "title": "DBMS Revision", "time": "30 min", "icon": "💻" }
    ]`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      
      // Clean up potential markdown formatting from Gemini
      if (text.startsWith('\`\`\`json')) {
        text = text.substring(7, text.length - 3).trim();
      } else if (text.startsWith('\`\`\`')) {
        text = text.substring(3, text.length - 3).trim();
      }
      
      const plan = JSON.parse(text);
      return plan;
    } catch (error) {
      this.logger.error('AI Plan Generation Error', error);
      // Fallback plan
      return [
        { title: "English - Vocabulary", time: "15 min", icon: "📚" },
        { title: `${profile.target_goals ? profile.target_goals[0] : 'Core Subject'} Practice`, time: "40 min", icon: "💻" }
      ];
    }
  }

  async generateStudyPlan(level: string, exam: string) {
    if (!this.genAI) throw new HttpException('AI not configured', HttpStatus.SERVICE_UNAVAILABLE);

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const prompt = `Generate a detailed 4-week adaptive study plan for a student at '${level}' English proficiency, preparing for the '${exam}' government examination in India. Format the output in clean JSON with a list of weeks, each containing a list of daily topics.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Attempt to extract JSON from the text
      const jsonMatch = text.match(/```json([\s\S]*?)```/);
      const cleanJson = jsonMatch ? jsonMatch[1].trim() : text;
      
      return JSON.parse(cleanJson);
    } catch (error) {
      this.logger.error('Gemini plan generation error', error);
      throw new HttpException('Failed to generate study plan', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
