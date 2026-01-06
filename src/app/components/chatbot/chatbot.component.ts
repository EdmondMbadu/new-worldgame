import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChatContextService, PlaygroundContext, PlaygroundQuestion } from 'src/app/services/chat-context.service';
import { ChatSessionService, ChatSessionRecord, ChatMessageRecord } from 'src/app/services/chat-session.service';

export interface Source {
  title: string;
  url: string;
}

export interface DisplayMessage {
  text?: string;
  src?: string;
  link?: { text?: string; url?: string };
  type: 'PROMPT' | 'RESPONSE' | 'IMAGE' | 'ATTACHMENT';
  streaming?: boolean;
  insertable?: boolean;  // Can this response be inserted into a playground box?
  sources?: Source[];  // Sources/citations for the response
  imageDocId?: string;  // Reference to the chatbot-images collection document
  imagePrompt?: string;  // The prompt that generated this image (for download filename)
}

export interface AiAvatar {
  id: string;
  name: string;
  shortName?: string;
  avatarPath: string;
  collectionKey: string;
  intro: string;
  group: 'colleague' | 'elder';
}

type UiPhase = 'idle' | 'thinking' | 'error';

interface PendingPreview {
  file: File;
  mime: string;
  uploading: boolean;
  path?: string;
  url?: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit, OnDestroy {
  showBot = false;
  isEnlarged = false;
  isFullScreen = false;
  copyButtonText = 'Copy';
  private attachment: { url: string; mime: string } | null = null;
  MAX_SIZE = 10 * 1024 * 1024;

  singleCopyStates: string[] = [];

  user: User = {};
  profilePicturePath = '';

  status = '';
  errorMsg = '';
  prompt = '';

  previews: PendingPreview[] = [];
  uploading = false;

  collectionPath: string;

  // AI Avatar Selection
  showAiSelector = false;
  selectedAi: AiAvatar;
  
  // Context Integration
  playgroundContext: PlaygroundContext | null = null;
  private contextSub?: Subscription;
  private insertCompleteSub?: Subscription;
  
  // Insert UI State
  showInsertMenu: number | null = null;  // Index of message showing insert menu
  insertingTo: string | null = null;     // Key of question being inserted to
  insertSuccess: string | null = null;   // Shows success message for question key

  // Session Persistence State
  currentSessionId: string | null = null;
  sessions: ChatSessionRecord[] = [];
  showHistoryPanel = false;
  private sessionsSub?: Subscription;
  private messagesSub?: Subscription;
  isLoadingHistory = false;
  isLoadingSession = false;

  aiAvatars: AiAvatar[] = [
    {
      id: 'bucky',
      name: 'Buckminster Fuller',
      shortName: 'Bucky',
      avatarPath: 'assets/img/fuller.jpg',
      collectionKey: 'discussions',
      intro: "Visionary architect, systems theorist, and inventor. Let's solve world problems together.",
      group: 'elder',
    },
    {
      id: 'zara',
      name: 'Zara Nkosi',
      avatarPath: 'assets/img/zara-agent.png',
      collectionKey: 'zara',
      intro: 'Development specialist focused on poverty reduction and quality education.',
      group: 'colleague',
    },
    {
      id: 'arjun',
      name: 'Arjun Patel',
      avatarPath: 'assets/img/arjun-agent.png',
      collectionKey: 'arjun',
      intro: 'Infrastructure expert specializing in sustainable cities and clean water.',
      group: 'colleague',
    },
    {
      id: 'sofia',
      name: 'Sofia Morales',
      avatarPath: 'assets/img/sofia-agent.png',
      collectionKey: 'sofia',
      intro: 'Climate action advocate working on gender equality and peace.',
      group: 'colleague',
    },
    {
      id: 'li',
      name: 'Li Wei',
      avatarPath: 'assets/img/li-agent.png',
      collectionKey: 'li',
      intro: 'Innovation specialist in sustainable agriculture and smart cities.',
      group: 'colleague',
    },
    {
      id: 'amina',
      name: 'Amina Al-Sayed',
      avatarPath: 'assets/img/amina-agent.png',
      collectionKey: 'amina',
      intro: 'Human rights expert focusing on equality and climate resilience.',
      group: 'colleague',
    },
    {
      id: 'elena',
      name: 'Elena Volkov',
      avatarPath: 'assets/img/elena-agent.png',
      collectionKey: 'elena',
      intro: 'Health and energy systems researcher promoting sustainable partnerships.',
      group: 'colleague',
    },
    {
      id: 'tane',
      name: 'Tane Kahu',
      avatarPath: 'assets/img/tane-agent.png',
      collectionKey: 'tane',
      intro: 'Environmental guardian protecting life below water and on land.',
      group: 'colleague',
    },
    {
      id: 'marie',
      name: 'Marie Curie',
      avatarPath: 'assets/img/marie-curie.jpg',
      collectionKey: 'marie',
      intro: 'Pioneer in physics and chemistry, advocate for scientific discovery.',
      group: 'elder',
    },
    {
      id: 'rachel',
      name: 'Rachel Carson',
      avatarPath: 'assets/img/rachel-carlson.jpeg',
      collectionKey: 'rachel',
      intro: 'Environmental scientist and conservationist who sparked the ecology movement.',
      group: 'elder',
    },
    {
      id: 'albert',
      name: 'Albert Einstein',
      avatarPath: 'assets/img/albert.png',
      collectionKey: 'albert',
      intro: 'Theoretical physicist and humanitarian, exploring the universe and peace.',
      group: 'elder',
    },
    {
      id: 'nelson',
      name: 'Nelson Mandela',
      avatarPath: 'assets/img/mandela.png',
      collectionKey: 'nelson',
      intro: 'Champion of freedom, equality, and reconciliation.',
      group: 'elder',
    },
    {
      id: 'gandhi',
      name: 'Mahatma Gandhi',
      avatarPath: 'assets/img/gandhi.jpg',
      collectionKey: 'gandhi',
      intro: 'Leader of nonviolent resistance and advocate for peace and justice.',
      group: 'elder',
    },
  ];

  introMessage: DisplayMessage = {
    text: '',
    link: { text: 'here.', url: '/blogs/nwg-ai' },
    type: 'RESPONSE',
  };

  responses: DisplayMessage[] = [];

  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private cdRef: ChangeDetectorRef,
    private storage: AngularFireStorage,
    public router: Router,
    public chatContext: ChatContextService,
    private translate: TranslateService,
    private chatSession: ChatSessionService
  ) {
    this.user = this.auth.currentUser;
    this.selectedAi = this.aiAvatars[0];
    this.collectionPath = `users/${this.auth.currentUser.uid}/${this.selectedAi.collectionKey}`;
    this.updateIntroMessage();
  }

  uiPhase: UiPhase = 'idle';
  thinkingLabel = 'Thinking';
  isGeneratingImage = false;
  private thinkingTimer?: any;
  private thinkingPhrases = ['Thinking'];
  private imageThinkingPhrases = ['Creating image', 'Generating visual', 'Rendering'];
  private thinkingIndex = 0;

  ngOnDestroy(): void {
    this.stopThinking();
    this.contextSub?.unsubscribe();
    this.insertCompleteSub?.unsubscribe();
    this.sessionsSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
  }

  ngOnInit(): void {
    if (this.user?.profilePicture?.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL!;
    }
    
    // Load sessions for current avatar and restore the most recent one
    this.loadSessionsForCurrentAvatar();
    
    // Subscribe to playground context
    this.contextSub = this.chatContext.context$.subscribe(ctx => {
      this.playgroundContext = ctx;
      this.updateIntroMessage();
      this.cdRef.detectChanges();
    });
    
    // Subscribe to insert completion events
    this.insertCompleteSub = this.chatContext.insertComplete$.subscribe(result => {
      this.insertingTo = null;
      if (result.success) {
        this.insertSuccess = result.questionKey;
        setTimeout(() => {
          this.insertSuccess = null;
          this.cdRef.detectChanges();
        }, 2000);
      }
      this.cdRef.detectChanges();
    });
  }

  private updateIntroMessage(): void {
    let intro = `I'm ${this.selectedAi.name}. ${this.selectedAi.intro}`;
    
    // Add context-aware intro if in playground
    if (this.playgroundContext) {
      intro = `I'm ${this.selectedAi.name}, helping you with "${this.playgroundContext.solutionTitle}". `;
      intro += `You're on ${this.playgroundContext.currentStepName}. `;
      intro += `Ask me anything about this step or your solution! To learn more about how to interact with me see `;
    } else {
      intro += ' To learn how to interact with me efficiently see ';
    }
    
    this.introMessage.text = intro;
  }

  // Check if we're in playground context
  get hasContext(): boolean {
    return this.playgroundContext !== null;
  }

  // Get available questions for insertion
  get availableQuestions(): PlaygroundQuestion[] {
    return this.playgroundContext?.questions || [];
  }

  selectAi(ai: AiAvatar): void {
    if (this.selectedAi.id === ai.id) {
      this.showAiSelector = false;
      return;
    }
    
    this.selectedAi = ai;
    this.collectionPath = `users/${this.auth.currentUser.uid}/${ai.collectionKey}`;
    this.updateIntroMessage();
    this.responses = [];
    this.currentSessionId = null;
    this.showAiSelector = false;
    
    // Load sessions for the new avatar
    this.loadSessionsForCurrentAvatar();
    this.cdRef.detectChanges();
  }

  toggleAiSelector(): void {
    this.showAiSelector = !this.showAiSelector;
  }

  // =========== Session Management Methods ===========
  
  /**
   * Load all sessions for the current avatar and restore the most recent one
   */
  private loadSessionsForCurrentAvatar(): void {
    this.sessionsSub?.unsubscribe();
    this.messagesSub?.unsubscribe();
    
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    
    this.isLoadingHistory = true;
    this.sessionsSub = this.chatSession
      .listSessionsForAvatar(uid, this.selectedAi.id)
      .subscribe({
        next: (sessions) => {
          this.sessions = sessions;
          this.isLoadingHistory = false;
          
          // Auto-restore the most recent session if we don't have one active
          if (!this.currentSessionId && sessions.length > 0 && this.responses.length === 0) {
            this.loadSession(sessions[0].id);
          }
          
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('Error loading sessions:', err);
          this.isLoadingHistory = false;
          this.cdRef.detectChanges();
        }
      });
  }

  /**
   * Load a specific session's messages
   */
  loadSession(sessionId: string): void {
    this.messagesSub?.unsubscribe();
    
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    
    this.isLoadingSession = true;
    this.currentSessionId = sessionId;
    this.showHistoryPanel = false;
    
    this.messagesSub = this.chatSession
      .observeMessages(uid, sessionId)
      .subscribe({
        next: (messages) => {
          // Convert ChatMessageRecord to DisplayMessage
          this.responses = messages.map(msg => ({
            text: msg.text,
            type: msg.type as 'PROMPT' | 'RESPONSE',
          }));
          this.isLoadingSession = false;
          this.cdRef.detectChanges();
          setTimeout(() => this.scrollToBottom('auto'), 0);
        },
        error: (err) => {
          console.error('Error loading messages:', err);
          this.isLoadingSession = false;
          this.cdRef.detectChanges();
        }
      });
  }

  /**
   * Start a new conversation
   */
  startNewConversation(): void {
    this.messagesSub?.unsubscribe();
    this.currentSessionId = null;
    this.responses = [];
    this.showHistoryPanel = false;
    this.updateIntroMessage();
    this.cdRef.detectChanges();
  }

  /**
   * Toggle the history panel
   */
  toggleHistoryPanel(): void {
    this.showHistoryPanel = !this.showHistoryPanel;
    this.showAiSelector = false; // Close AI selector if open
  }

  /**
   * Delete a session from history
   */
  async deleteSessionFromHistory(sessionId: string, event: Event): Promise<void> {
    event.stopPropagation();
    
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    
    try {
      await this.chatSession.deleteSession(uid, sessionId);
      
      // If we deleted the current session, start a new one
      if (this.currentSessionId === sessionId) {
        this.startNewConversation();
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }

  /**
   * Generate a title from the first message
   */
  private generateSessionTitle(firstMessage: string): string {
    if (!firstMessage) return 'New conversation';
    
    // Clean up the message
    const cleaned = firstMessage.replace(/\s+/g, ' ').trim();
    
    // Take first sentence or first ~50 chars
    const firstSentenceMatch = cleaned.match(/^[^.!?]+[.!?]?/);
    let title = firstSentenceMatch ? firstSentenceMatch[0] : cleaned;
    
    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }
    
    return title || 'New conversation';
  }

  /**
   * Format session date for display
   */
  formatSessionDate(timestamp: number | undefined): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get the current session's title
   */
  get currentSessionTitle(): string {
    if (!this.currentSessionId) return 'New conversation';
    const session = this.sessions.find(s => s.id === this.currentSessionId);
    return session?.title || 'Conversation';
  }

  get colleagueAvatars(): AiAvatar[] {
    return this.aiAvatars.filter(a => a.group === 'colleague');
  }

  get elderAvatars(): AiAvatar[] {
    return this.aiAvatars.filter(a => a.group === 'elder');
  }

  getDisplayName(ai: AiAvatar): string {
    return ai.shortName || ai.name.split(' ')[0];
  }

  openFullPage(): void {
    this.showBot = false;
    this.router.navigate(['/ask-bucky'], { queryParams: { from: 'widget' } });
  }

  toggleBot() {
    this.showBot = !this.showBot;
    if (this.showBot) {
      this.showAiSelector = false;
    }
  }

  toggleInsertMenu(index: number): void {
    if (this.showInsertMenu === index) {
      this.showInsertMenu = null;
    } else {
      this.showInsertMenu = index;
    }
  }

  insertToQuestion(questionKey: string, content: string): void {
    // Strip markdown formatting for clean plain text insertion
    const cleanContent = this.stripMarkdown(content);
    console.log('insertToQuestion called:', { questionKey, contentPreview: cleanContent.slice(0, 100) });
    this.insertingTo = questionKey;
    this.showInsertMenu = null;
    
    // Check if the question already has content - if so, append
    const existingAnswer = this.playgroundContext?.questions.find(q => q.key === questionKey)?.currentAnswer;
    const mode = existingAnswer ? 'append' : 'replace';
    
    this.chatContext.requestInsert(questionKey, cleanContent, mode);
  }

  insertImageToQuestion(questionKey: string, imageUrl: string, imagePrompt?: string): void {
    // Create an HTML img tag for CKEditor insertion
    const altText = imagePrompt ? this.escapeHtml(imagePrompt.slice(0, 100)) : 'AI Generated Image';
    const imageHtml = `<figure class="image"><img src="${this.escapeHtml(imageUrl)}" alt="${altText}" /></figure>`;
    
    console.log('insertImageToQuestion called:', { questionKey, imageUrl, imageHtml });
    this.insertingTo = questionKey;
    this.showInsertMenu = null;
    
    // Check if the question already has content - if so, append
    const existingAnswer = this.playgroundContext?.questions.find(q => q.key === questionKey)?.currentAnswer;
    const mode = existingAnswer ? 'append' : 'replace';
    
    this.chatContext.requestInsert(questionKey, imageHtml, mode);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Convert markdown to HTML for CKEditor insertion
   * CKEditor uses HTML, so we need to convert markdown to proper HTML tags
   */
  private stripMarkdown(text: string): string {
    if (!text) return '';
    
    let result = text;
    
    // Remove code blocks first (before other processing)
    result = result.replace(/```[\s\S]*?```/g, '');
    
    // Remove inline code but keep content
    result = result.replace(/`([^`]+)`/g, '$1');
    
    // Remove images
    result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // Convert links to just text (or keep as HTML links)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Process line by line
    const lines = result.split('\n');
    const htmlLines: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (inList) {
          htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          inList = false;
          listType = null;
        }
        const level = headerMatch[1].length;
        const headerText = this.processInlineMarkdown(headerMatch[2]);
        htmlLines.push(`<h${level}>${headerText}</h${level}>`);
        continue;
      }
      
      // Check for unordered list items
      const ulMatch = line.match(/^(\s*)[\*\-\+]\s+(.+)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          htmlLines.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        const itemText = this.processInlineMarkdown(ulMatch[2]);
        htmlLines.push(`<li>${itemText}</li>`);
        continue;
      }
      
      // Check for ordered list items
      const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          htmlLines.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        const itemText = this.processInlineMarkdown(olMatch[2]);
        htmlLines.push(`<li>${itemText}</li>`);
        continue;
      }
      
      // Close list if we hit a non-list line
      if (inList && line.trim() !== '') {
        htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      
      // Check for blockquotes
      const blockquoteMatch = line.match(/^>\s*(.*)$/);
      if (blockquoteMatch) {
        const quoteText = this.processInlineMarkdown(blockquoteMatch[1]);
        htmlLines.push(`<blockquote>${quoteText}</blockquote>`);
        continue;
      }
      
      // Skip horizontal rules
      if (/^[-*_]{3,}\s*$/.test(line)) {
        htmlLines.push('<hr>');
        continue;
      }
      
      // Empty line = paragraph break
      if (line.trim() === '') {
        if (!inList) {
          htmlLines.push('</p><p>');
        }
        continue;
      }
      
      // Regular text - process inline markdown
      const processedLine = this.processInlineMarkdown(line);
      htmlLines.push(processedLine);
    }
    
    // Close any open list
    if (inList) {
      htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
    }
    
    // Join and wrap in paragraph
    let html = htmlLines.join('\n');
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/^<\/p><p>/, '');
    html = html.replace(/<\/p><p>$/, '');
    
    // Wrap in paragraph if not already wrapped in block element
    if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') && !html.startsWith('<p')) {
      html = '<p>' + html + '</p>';
    }
    
    // Fix double paragraph tags
    html = html.replace(/<\/p>\s*<p>\s*<\/p>\s*<p>/g, '</p><p>');
    
    return html.trim();
  }
  
  /**
   * Process inline markdown (bold, italic) within a line
   */
  private processInlineMarkdown(text: string): string {
    let result = text;
    
    // ***bold italic*** or ___bold italic___
    result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    result = result.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    
    // **bold** or __bold__
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // *italic* or _italic_
    result = result.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    result = result.replace(/(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g, '<em>$1</em>');
    
    return result;
  }

  getQuestionLabel(key: string): string {
    // Format like "S1-A" to "1A" for compact display
    return key.replace('S', '').replace('-', '');
  }

  EXT_MIME: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };

  handleFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > this.MAX_SIZE) {
      this.responses.push({
        type: 'RESPONSE',
        text: `⚠️ That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — limit is 10 MB.`,
      });
      this.scrollToBottom();
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type || this.EXT_MIME[ext] || 'application/octet-stream';

    const preview: PendingPreview = { file, mime, uploading: true };
    this.previews.push(preview);
    this.uploading = true;

    const path = `chat-uploads/${Date.now()}_${file.name}`;
    const task = this.storage.upload(path, file, { contentType: mime });

    task
      .snapshotChanges()
      .pipe(
        finalize(async () => {
          preview.uploading = false;
          preview.path = path;
          preview.url = await this.storage
            .ref(path)
            .getDownloadURL()
            .toPromise();
          this.uploading = this.previews.some((p) => p.uploading);
        })
      )
      .subscribe();
  }

  removePreview(i: number) {
    const [preview] = this.previews.splice(i, 1);
    if (preview.path && !preview.uploading) {
      this.storage
        .ref(preview.path)
        .delete()
        .toPromise()
        .catch(() => {});
    }
    this.uploading = this.previews.some((p) => p.uploading);
  }

  toggleChatSize() {
    this.isEnlarged = !this.isEnlarged;
  }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
  }

  async submitPrompt() {
    if (this.uploading) return;

    const trimmed = this.prompt.trim();
    if (!trimmed && !this.previews.length) return;

    const uid = this.auth.currentUser?.uid;
    
    // Create a new session if we don't have one
    if (!this.currentSessionId && uid && trimmed) {
      const title = this.generateSessionTitle(trimmed);
      this.currentSessionId = await this.chatSession.createSession(uid, {
        avatarSlug: this.selectedAi.id,
        avatarName: this.selectedAi.name,
        title,
        firstMessagePreview: trimmed,
      });
    }

    if (trimmed) {
      this.responses.push({ text: trimmed, type: 'PROMPT' });
      
      // Persist the prompt to the session
      if (uid && this.currentSessionId) {
        this.chatSession.addMessage(uid, this.currentSessionId, {
          text: trimmed,
          type: 'PROMPT',
        }).catch(err => console.error('Error persisting prompt:', err));
      }
    }

    const attachmentMsgs: DisplayMessage[] = this.previews
      .filter((p) => p.url && !p.uploading)
      .map((p) => ({
        type: 'ATTACHMENT',
        text: p.file.name,
        src: p.url!,
      }));
    this.responses.push(...attachmentMsgs);

    this.cdRef.detectChanges();
    setTimeout(() => this.scrollToBottom(), 0);

    const attachmentList = attachmentMsgs.map((a) => ({
      url: a.src!,
      name: a.text!,
      mime:
        this.EXT_MIME[a.text!.split('.').pop()!.toLowerCase()] ||
        'application/octet-stream',
    }));

    // Build prompt with context and avatar identity
    let fullPrompt = trimmed;
    // Always include avatar identity to ensure AI knows who it is
    const contextPrefix = this.chatContext.buildContextPrompt(
      this.selectedAi.name,
      this.selectedAi.intro
    );
    fullPrompt = contextPrefix + trimmed;

    const docId = this.afs.createId();
    const discussionRef: AngularFirestoreDocument<any> = this.afs.doc(
      `${this.collectionPath}/${docId}`
    );

    // Debug logging
    console.log('Chatbot Debug:', {
      collectionPath: this.collectionPath,
      docId,
      promptLength: fullPrompt.length,
      hasContext: !!this.playgroundContext,
      selectedAi: this.selectedAi.name,
      sessionId: this.currentSessionId,
    });

    // Detect if this is an image generation request for UI feedback
    const isImageGen = this.isImageRequest(trimmed);
    
    await discussionRef.set({
      prompt: fullPrompt,
      attachmentList,
    });
    this.startThinking(isImageGen);
    this.cdRef.detectChanges();

    this.prompt = '';
    this.previews = [];
    this.uploading = false;
    this.status = 'sure, one sec';

    const unsub = discussionRef.valueChanges().subscribe({
      next: (snap) => {
        if (!snap?.status) return;
        const state = snap.status.state;

        switch (state) {
          case 'PROCESSING':
            this.startThinking(isImageGen);
            this.status = isImageGen ? 'generating your image...' : 'preparing your answer...';
            break;

          case 'COMPLETED':
            this.stopThinking();
            this.status = '';
            if (snap.response) {
              const slot: DisplayMessage = {
                type: 'RESPONSE',
                text: '',
                streaming: true,
                insertable: this.hasContext,  // Mark as insertable if in playground context
                sources: snap.sources || undefined,  // Add sources if available
              };
              this.responses.push(slot);
              this.cdRef.detectChanges();
              setTimeout(() => this.scrollToBottom('auto'), 0);

              this.typewriterEffect(snap.response, slot, () => {
                slot.streaming = false;
                // Ensure sources are set after streaming completes
                if (snap.sources && !slot.sources) {
                  slot.sources = snap.sources;
                }
                
                // Persist the response to the session after streaming completes
                if (uid && this.currentSessionId && snap.response) {
                  this.chatSession.addMessage(uid, this.currentSessionId, {
                    text: snap.response,
                    type: 'RESPONSE',
                  }).catch(err => console.error('Error persisting response:', err));
                }
                
                this.cdRef.detectChanges();
                setTimeout(() => this.scrollToBottom('smooth'), 0);
              });
            }
            if (snap.imageUrl) {
              // Find the last user prompt to use for the image filename
              const lastPrompt = [...this.responses].reverse().find(r => r.type === 'PROMPT');
              this.responses.push({ 
                src: snap.imageUrl, 
                type: 'IMAGE',
                imageDocId: snap.imageDocId || undefined,
                imagePrompt: lastPrompt?.text || undefined
              });
            }
            this.cdRef.detectChanges();
            setTimeout(() => this.scrollToBottom(), 0);
            unsub.unsubscribe();
            break;

          case 'ERRORED':
            this.stopThinking();
            console.error('Chatbot Error:', snap.status);
            // Show the user-friendly error message from the backend
            const errorMessage = snap.response || snap.status?.error || 'Something went wrong. Please try again.';
            this.responses.push({
              type: 'RESPONSE',
              text: errorMessage,
            });
            
            // Persist error response to the session
            if (uid && this.currentSessionId) {
              this.chatSession.addMessage(uid, this.currentSessionId, {
                text: errorMessage,
                type: 'RESPONSE',
              }).catch(err => console.error('Error persisting error response:', err));
            }
            
            this.status = '';
            this.cdRef.detectChanges();
            setTimeout(() => this.scrollToBottom(), 0);
            unsub.unsubscribe();
            break;
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err.message;
        unsub.unsubscribe();
      },
    });
  }

  endChat() {
    // Don't delete documents - they're now persisted in sessions
    // Just close the chat panel
    this.toggleBot();
  }

  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const chatbox = document.getElementById('chatbox');
    if (chatbox) {
      chatbox.scrollTo({ top: chatbox.scrollHeight, behavior });
    }
  }

  private typewriterEffect(
    fullText: string,
    msg: DisplayMessage,
    done: () => void
  ): void {
    let i = 0;
    const chunkSize = 8;
    msg.text = msg.text || '';

    const id = setInterval(() => {
      const next = fullText.slice(i, i + chunkSize);
      msg.text += next;
      i += next.length;

      this.cdRef.detectChanges();
      this.scrollToBottom('auto');

      if (i >= fullText.length) {
        clearInterval(id);
        this.scrollToBottom('smooth');
        done();
      }
    }, 10);
  }

  copyChat() {
    let result = `${this.selectedAi.name}: ${this.introMessage.text}`;
    if (this.introMessage.link) {
      result +=
        ' ' +
        this.introMessage.link.text +
        ' (' +
        this.introMessage.link.url +
        ')';
    }

    for (const msg of this.responses) {
      if (msg.type === 'PROMPT') {
        result += `\n\nYou: ${msg.text}`;
      } else {
        result += `\n\n${this.selectedAi.name}: ${msg.text}`;
      }
    }

    navigator.clipboard.writeText(result).then(
      () => {
        this.copyButtonText = 'Copied!';
        setTimeout(() => {
          this.copyButtonText = 'Copy';
        }, 2000);
      },
      (err) => {
        console.error('Failed to copy chat:', err);
      }
    );
  }

  copySingleMessage(text: string, index: number) {
    const formattedMessage = this.formatText(text);

    const blobPlain = new Blob([formattedMessage], { type: 'text/plain' });
    const blobHtml = new Blob([formattedMessage], { type: 'text/html' });

    const clipboardItem = new ClipboardItem({
      'text/plain': blobPlain,
      'text/html': blobHtml,
    });

    navigator.clipboard.write([clipboardItem]).then(
      () => {
        this.singleCopyStates[index] = 'Copied!';
        setTimeout(() => {
          this.singleCopyStates[index] = 'Copy';
        }, 2000);
      },
      (err) => {
        console.error('Failed to copy single message:', err);
      }
    );
  }

  formatText(value: string): string {
    if (!value) return '';

    let formatted = value;
    formatted = formatted.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.*?)$/gm, '<h3>$1</h3>');

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    formatted = formatted.replace(/^\* (.*?)(?=\n|$)/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');

    formatted = formatted.replace(/\n/g, '<br>');

    formatted = formatted.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a class="text-blue-500 underline" target="_blank" href="$2">$1</a>'
    );

    return formatted;
  }

  async deleteAllDocuments(): Promise<void> {
    const batch = this.afs.firestore.batch();
    const snapshot = await this.afs.collection(this.collectionPath).ref.get();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async downloadImage(src: string, promptText?: string) {
    // Generate a meaningful filename from the prompt
    let filename: string;
    
    if (promptText) {
      // Clean the prompt to create a filename-safe string
      const cleanPrompt = promptText
        .toLowerCase()
        .replace(/^(generate|create|make|draw|paint|design|render|produce)\s+(an?\s+)?(image|picture|photo|illustration|artwork|visual|graphic)\s+(of|for|showing|depicting|illustrating)?\s*/i, '')
        .replace(/[^a-z0-9\s]/gi, '') // Remove special characters
        .trim()
        .split(/\s+/)
        .slice(0, 6) // Take first 6 words
        .join('-');
      
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      filename = `${this.getDisplayName(this.selectedAi)}-${cleanPrompt || 'image'}-${timestamp}.png`;
    } else {
      filename = `${this.getDisplayName(this.selectedAi)}-image-${Date.now()}.png`;
    }

    try {
      const response = await fetch(src, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(src, '_blank', 'noopener');
    }
  }

  handleComposerKey(event: KeyboardEvent) {
    if ((event as any).isComposing) return;

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      if (!this.uploading) {
        this.submitPrompt();
      }
    }
  }

  /**
   * Detects if the prompt is requesting an image generation
   */
  private isImageRequest(prompt: string): boolean {
    const imagePatterns = [
      /\b(generate|create|make|draw|paint|design|render|produce)\s+(an?\s+)?(image|picture|photo|illustration|artwork|visual|graphic|diagram|infographic)/i,
      /\b(image|picture|photo|illustration|artwork|visual|graphic)\s+(of|for|showing|depicting|illustrating)/i,
      /\bshow\s+me\s+(an?\s+)?(image|picture|visual)/i,
      /\bvisualize\b/i,
      /\billustrate\b/i,
      /\bcreate\s+(a\s+)?visual/i,
      /\b(can you|please|could you)\s+(generate|create|make|draw)\s+(an?\s+)?(image|picture)/i,
    ];
    return imagePatterns.some(pattern => pattern.test(prompt));
  }

  /**
   * Inserts an image generation prompt prefix into the input
   */
  insertImagePrompt(): void {
    const prefix = this.translate.instant('chatbot.imageGeneration.promptPrefix');
    // Check if prompt already starts with the prefix (case-insensitive)
    const lowerPrompt = this.prompt.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    if (!lowerPrompt.startsWith(lowerPrefix)) {
      this.prompt = prefix + this.prompt;
    }
    // Focus the textarea
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        // Move cursor to end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 0);
  }

  private startThinking(forImageGeneration = false): void {
    if (this.thinkingTimer) {
      clearInterval(this.thinkingTimer);
      this.thinkingTimer = undefined;
    }

    this.uiPhase = 'thinking';
    this.isGeneratingImage = forImageGeneration;
    this.thinkingIndex = 0;
    
    const phrases = forImageGeneration ? this.imageThinkingPhrases : this.thinkingPhrases;
    this.thinkingLabel = phrases[this.thinkingIndex];

    this.thinkingTimer = setInterval(() => {
      this.thinkingIndex = (this.thinkingIndex + 1) % phrases.length;
      this.thinkingLabel = phrases[this.thinkingIndex];
    }, 900);
  }

  private stopThinking(): void {
    if (this.thinkingTimer) {
      clearInterval(this.thinkingTimer);
      this.thinkingTimer = undefined;
    }
    this.uiPhase = 'idle';
    this.isGeneratingImage = false;
  }
}
