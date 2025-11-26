import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface PlaygroundQuestion {
  key: string;        // e.g., 'S1-A', 'S2-B'
  label: string;      // e.g., 'Question 1', 'S1-A'
  text: string;       // The actual question text
  currentAnswer?: string;  // What's currently in the box
}

export interface PlaygroundContext {
  solutionId: string;
  solutionTitle: string;
  solutionDescription?: string;
  currentStepIndex: number;  // 0-4 for steps 1-5
  currentStepName: string;   // e.g., "Step 1: Defining the Problem State"
  questions: PlaygroundQuestion[];
  allStepsData?: Record<string, string>;  // All answers so far
}

export interface InsertRequest {
  questionKey: string;
  content: string;
  mode: 'replace' | 'append';
}

@Injectable({
  providedIn: 'root'
})
export class ChatContextService {
  // Current playground context (null when not on playground page)
  private contextSubject = new BehaviorSubject<PlaygroundContext | null>(null);
  context$ = this.contextSubject.asObservable();

  // Event emitter for when user wants to insert content
  private insertRequestSubject = new Subject<InsertRequest>();
  insertRequest$ = this.insertRequestSubject.asObservable();

  // Event emitter for when insertion is complete
  private insertCompleteSubject = new Subject<{ questionKey: string; success: boolean }>();
  insertComplete$ = this.insertCompleteSubject.asObservable();

  constructor() {}

  /**
   * Set the current playground context (called by PlaygroundStepsComponent)
   */
  setContext(context: PlaygroundContext | null): void {
    this.contextSubject.next(context);
  }

  /**
   * Get current context synchronously
   */
  getContext(): PlaygroundContext | null {
    return this.contextSubject.getValue();
  }

  /**
   * Check if we're currently in a playground context
   */
  hasContext(): boolean {
    return this.contextSubject.getValue() !== null;
  }

  /**
   * Update context when user changes step
   */
  updateStep(stepIndex: number, stepName: string, questions: PlaygroundQuestion[]): void {
    const current = this.contextSubject.getValue();
    if (current) {
      this.contextSubject.next({
        ...current,
        currentStepIndex: stepIndex,
        currentStepName: stepName,
        questions
      });
    }
  }

  /**
   * Update a single question's current answer in context
   */
  updateQuestionAnswer(questionKey: string, answer: string): void {
    const current = this.contextSubject.getValue();
    if (current) {
      const questions = current.questions.map(q => 
        q.key === questionKey ? { ...q, currentAnswer: answer } : q
      );
      const allStepsData = { ...current.allStepsData, [questionKey]: answer };
      this.contextSubject.next({ ...current, questions, allStepsData });
    }
  }

  /**
   * Request to insert content into a specific question box
   * (called by ChatbotComponent)
   */
  requestInsert(questionKey: string, content: string, mode: 'replace' | 'append' = 'replace'): void {
    console.log('ChatContextService.requestInsert:', { 
      questionKey, 
      contentLength: content?.length, 
      mode,
      hasSubscribers: this.insertRequestSubject.observers.length 
    });
    this.insertRequestSubject.next({ questionKey, content, mode });
  }

  /**
   * Notify that insertion is complete (called by PlaygroundStepsComponent)
   */
  notifyInsertComplete(questionKey: string, success: boolean): void {
    this.insertCompleteSubject.next({ questionKey, success });
  }

  /**
   * Clear context (called when leaving playground page)
   */
  clearContext(): void {
    this.contextSubject.next(null);
  }

  /**
   * Build a contextual prompt prefix for the AI
   * @param avatarName - The name of the AI avatar (e.g., "Buckminster Fuller", "Zara Nkosi")
   * @param avatarIntro - Brief description of the avatar's expertise
   */
  buildContextPrompt(avatarName?: string, avatarIntro?: string): string {
    const ctx = this.contextSubject.getValue();
    
    let prompt = '';
    
    // Identity instruction - CRITICAL: Tell the AI it IS the avatar
    if (avatarName) {
      prompt += `[ROLE: You ARE ${avatarName}. ${avatarIntro || ''} `;
      prompt += `Answer all questions directly in first person as yourself. `;
      prompt += `NEVER refer to yourself in third person. NEVER ask for perspectives. NEVER end by prompting for other viewpoints. `;
      prompt += `Format responses with clear paragraphs, bullet points when listing items, and **bold** for key concepts. `;
      prompt += `IMPORTANT: Always use the Google Search tool to find current, accurate information and provide sources for factual claims, statistics, and data. `;
      prompt += `When citing information, mention the source naturally in your response (e.g., "According to [Source Name], there are approximately 8 billion people in the world"). `;
      prompt += `The sources will be automatically displayed below your response, so focus on integrating them naturally into your answer.]\n\n`;
    }
    
    // Solution context (if available)
    if (ctx) {
      prompt += `[CONTEXT: You are helping with a NewWorld Game solution called "${ctx.solutionTitle}". `;
      prompt += `The user is currently on ${ctx.currentStepName}. `;
      
      if (ctx.solutionDescription) {
        prompt += `Solution overview: ${ctx.solutionDescription.slice(0, 300)}... `;
      }

      // Add current step's questions and any existing answers
      if (ctx.questions.length > 0) {
        prompt += `\n\nCurrent step questions:\n`;
        ctx.questions.forEach((q, i) => {
          prompt += `${i + 1}. ${q.text.slice(0, 200)}`;
          if (q.currentAnswer) {
            prompt += ` [Current answer: ${q.currentAnswer.slice(0, 150)}...]`;
          }
          prompt += '\n';
        });
      }

      prompt += `\nProvide helpful, specific answers related to this solution and step. If the user asks a general question, answer it but try to relate it back to their solution context when relevant.]\n\n`;
    }
    
    return prompt;
  }
}

