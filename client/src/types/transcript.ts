export interface TranscriptResult {
  transcript: string | unknown;
}

export interface TranscriptionError {
  error: string;
}

export type TranscriptionResponse = TranscriptResult | TranscriptionError;

export type CompressionQuality = 'none' | '32k' | '16k';

export type AppMode = 'transcribe' | 'meeting';

export interface MeetingMetadata {
  date: string;
  membersPresent: string;
  absentWithApology: string;
}

export type ProcessingStep = 'uploading' | 'compressing' | 'transcribing' | 'writing-minutes' | 'complete';

export interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  progress?: number;
  elapsedSeconds: number;
  result?: string;
  error?: string;
  isRawView: boolean;
  compressionQuality: CompressionQuality;
  mode: AppMode;
  meetingMetadata: MeetingMetadata;
  storedTranscript: string;
  originalTranscript?: string;
  processingStep?: ProcessingStep;
  startTime?: number;
  endTime?: number;
  originalFile?: File;
  compressedFileUrl?: string | null;
  requestId?: string;
}