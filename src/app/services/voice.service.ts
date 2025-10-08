import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';

interface RecordingResult {
  base64: string;
  mimeType: string;
  durationMs: number;
}

interface SynthesizeOptions {
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private mediaStream?: MediaStream;
  private mediaRecorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private recordingStart = 0;
  private recordedMimeType = '';
  private currentAudio?: HTMLAudioElement;
  private currentAudioResolver?: () => void;
  private currentAudioRejector?: (err: Error) => void;

  readonly supportsRecording: boolean;

  constructor(private readonly functions: AngularFireFunctions) {
    this.supportsRecording =
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof MediaRecorder !== 'undefined';
  }

  async startRecording(): Promise<void> {
    if (!this.supportsRecording) {
      throw new Error('Voice recording is not supported in this browser.');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    const mimeType = this.chooseMimeType();
    this.recordedMimeType = mimeType || 'audio/webm';

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.mediaStream, { mimeType })
      : new MediaRecorder(this.mediaStream);

    this.chunks = [];
    this.recordingStart = Date.now();

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder) {
      return null;
    }

    const recorder = this.mediaRecorder;
    if (recorder.state === 'inactive' && !this.chunks.length) {
      this.cleanupStream();
      return null;
    }

    const stopped = new Promise<RecordingResult | null>((resolve) => {
      recorder.onstop = async () => {
        try {
          if (!this.chunks.length) {
            resolve(null);
            return;
          }

          const blob = new Blob(this.chunks, {
            type: this.recordedMimeType || recorder.mimeType,
          });

          const base64 = await this.blobToBase64(blob);
          const duration = Date.now() - this.recordingStart;

          resolve({
            base64,
            mimeType: blob.type || this.recordedMimeType || 'audio/webm',
            durationMs: duration,
          });
        } catch (err) {
          console.error('Failed to process recording', err);
          resolve(null);
        } finally {
          this.cleanupStream();
        }
      };
    });

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    return await stopped;
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanupStream();
    this.chunks = [];
  }

  async transcribeRecording(
    audioBase64: string,
    mimeType: string,
    languageCode = 'en-US'
  ): Promise<string> {
    const callable = this.functions.httpsCallable('transcribeAvatarAudio');
    const response: any = await firstValueFrom(
      callable({ audio: audioBase64, mimeType, languageCode })
    );
    return (response?.transcript || '').trim();
  }

  async synthesizeSpeech(
    text: string,
    options: SynthesizeOptions = {}
  ): Promise<string | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const callable = this.functions.httpsCallable('synthesizeAvatarSpeech');
    const response: any = await firstValueFrom(
      callable({
        text: trimmed,
        languageCode: options.languageCode,
        voiceName: options.voiceName,
        speakingRate: options.speakingRate,
        pitch: options.pitch,
      })
    );

    const audioContent = response?.audioContent;
    if (!audioContent || typeof audioContent !== 'string') {
      return null;
    }

    return `data:audio/mp3;base64,${audioContent}`;
  }

  async playText(
    text: string,
    options: SynthesizeOptions = {}
  ): Promise<void> {
    const dataUrl = await this.synthesizeSpeech(text, options);
    if (!dataUrl) return;

    this.stopPlayback();
    if (typeof Audio === 'undefined') return;

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(dataUrl);
      const finalize = (next?: () => void) => {
        if (this.currentAudio === audio) {
          audio.onended = null;
          audio.onerror = null;
          this.currentAudio = undefined;
          this.currentAudioResolver = undefined;
          this.currentAudioRejector = undefined;
        }
        if (next) next();
      };

      audio.onended = () => finalize(resolve);
      audio.onerror = () =>
        finalize(() => reject(new Error('Audio playback failed.')));

      this.currentAudio = audio;
      this.currentAudioResolver = () => finalize(resolve);
      this.currentAudioRejector = (err: Error) => finalize(() => reject(err));

      audio
        .play()
        .catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          finalize(() => reject(error));
        });
    }).catch((err) => {
      console.warn('Autoplay prevented or failed', err);
      throw err;
    });
  }

  stopPlayback(): void {
    if (this.currentAudio) {
      const audio = this.currentAudio;
      const resolver = this.currentAudioResolver;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
      this.currentAudio = undefined;
      this.currentAudioResolver = undefined;
      this.currentAudioRejector = undefined;
      resolver?.();
    }
  }

  private cleanupStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = undefined;
    }
    this.mediaRecorder = undefined;
    this.recordingStart = 0;
  }

  private chooseMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const preferred = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ];
    return preferred.find((type) => {
      try {
        return MediaRecorder.isTypeSupported(type);
      } catch {
        return false;
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const base64 = result.split(',').pop() || '';
          resolve(base64);
        } else {
          reject(new Error('Failed to read audio blob.'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Read error'));
      reader.readAsDataURL(blob);
    });
  }
}
