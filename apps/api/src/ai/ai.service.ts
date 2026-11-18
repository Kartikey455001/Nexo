import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genai: GoogleGenAI;
  private readonly model = 'gemini-2.5-flash';

  constructor() {
    this.genai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
  }

  async generateSmartReplies(
    messages: { sender: string; content: string }[]
  ): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) {
      return ['👍', 'Sounds good!', 'Got it!'];
    }

    const conversationContext = messages
      .slice(-10) // Last 10 messages for context
      .map((m) => `${m.sender}: ${m.content}`)
      .join('\n');

    const prompt = `You are a helpful assistant generating smart reply suggestions for a private messaging app.
Given the following conversation, generate exactly 3 short, natural, and relevant reply suggestions.
Each reply should be on a new line. Keep them brief (under 10 words each). No numbers, bullets, or labels.

Conversation:
${conversationContext}

Reply suggestions:`;

    try {
      const response = await this.genai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text || '';
      const replies = text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .slice(0, 3);

      return replies.length === 3 ? replies : ['👍', 'Sounds good!', 'Got it!'];
    } catch (err) {
      this.logger.warn('Failed to generate smart replies, using fallback', err);
      return ['👍', 'Sounds good!', 'Got it!'];
    }
  }

  async summarizeChat(
    messages: { sender: string; content: string }[]
  ): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return 'AI summarization requires a Gemini API key.';
    }

    const conversationContext = messages
      .map((m) => `${m.sender}: ${m.content}`)
      .join('\n');

    const prompt = `You are a helpful assistant. Summarize the following chat conversation in 2-3 concise sentences. 
Focus on the key topics discussed and any conclusions or decisions made. Be neutral and factual.

Conversation:
${conversationContext}

Summary:`;

    try {
      const response = await this.genai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      return response.text?.trim() || 'Could not generate summary.';
    } catch (err) {
      this.logger.error('Failed to generate summary', err);
      return 'Failed to generate summary. Please try again.';
    }
  }
}
