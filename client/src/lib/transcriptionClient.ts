import { extractTranscript } from './transcriptExtract';
import { CompressionQuality, MeetingMetadata } from '../types/transcript';

export interface TranscriptionResult {
  transcript: string;
  isUnrecognized: boolean;
}

export interface UploadResult {
  requestId: string;
  status: 'compressing' | 'transcribing';
  compressedFileUrl: string | null;
}

export interface TranscriptionClient {
  submit(file: File, signal?: AbortSignal, bitrate?: CompressionQuality): Promise<UploadResult>;
  poll(requestId: string, signal?: AbortSignal): Promise<{ status: string; compressedFileUrl?: string; result?: unknown; error?: string }>;
  submitMeeting(transcript: string, metadata: MeetingMetadata, signal?: AbortSignal): Promise<TranscriptionResult>;
}

class BlockingTranscriptionClient implements TranscriptionClient {
  private fieldName = 'file';
  
  async submit(file: File, signal?: AbortSignal, bitrate: CompressionQuality = '32k'): Promise<UploadResult> {
    const formData = new FormData();
    formData.append(this.fieldName, file);
    formData.append('transcribe', 'true');
    formData.append('condition', 'transcribe');
    
    if (bitrate !== 'none') {
      formData.append('bitrate', bitrate);
    }
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string }).error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    return {
      requestId: data.requestId,
      status: data.status,
      compressedFileUrl: data.compressedFileUrl || null,
    };
  }

  async poll(requestId: string, signal?: AbortSignal): Promise<{ status: string; compressedFileUrl?: string; result?: unknown; error?: string }> {
    const response = await fetch(`/api/transcribe/poll/${requestId}`, {
      method: 'GET',
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { error?: string }).error || 'Poll failed');
    }
    
    return await response.json();
  }

  async submitMeeting(transcript: string, metadata: MeetingMetadata, signal?: AbortSignal): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('transcript', transcript);
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('transcribe', 'false');
    formData.append('condition', 'transcribe');
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string }).error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const { text, isUnrecognized } = extractTranscript(data.transcript);
    
    return { transcript: text, isUnrecognized };
  }
}

export function createTranscriptionClient(): TranscriptionClient {
  return new BlockingTranscriptionClient();
}
