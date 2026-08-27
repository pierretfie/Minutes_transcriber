import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { Readable } from 'node:stream';
import { getSettings } from './config.js';

export const WEBHOOK_FIELD_NAME = 'file';

export interface TranscriptionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  statusCode?: number;
}

export async function sendToWebhook(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  additionalFields?: Record<string, string>
): Promise<TranscriptionResult> {
  const settings = getSettings();
  
  if (!settings.webhookUrl) {
    return {
      success: false,
      error: 'No webhook URL configured. Set one in Settings.',
    };
  }
  
  const form = new FormData();
  const stream = Readable.from(fileBuffer);
  form.append(WEBHOOK_FIELD_NAME, stream, {
    filename: fileName,
    contentType: mimeType,
  });
  
  if (additionalFields) {
    for (const [key, value] of Object.entries(additionalFields)) {
      form.append(key, value);
    }
  }
  
  try {
    const timeout = settings.requestTimeoutMs > 0 ? settings.requestTimeoutMs : undefined;
    
    const response = await axios.post(settings.webhookUrl, form, {
      headers: form.getHeaders(),
      timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    
    if (axiosError.code === 'ECONNABORTED') {
      return {
        success: false,
        error: `The request timed out after ${settings.requestTimeoutMs}ms. Long recordings may need a longer timeout — check Settings.`,
        statusCode: 408,
      };
    }
    
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      return {
        success: false,
        error: `Could not reach the webhook URL — check that n8n is running and the URL is correct.`,
        statusCode: 502,
      };
    }
    
    if (axiosError.response) {
      return {
        success: false,
        error: `n8n responded with status ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`,
        statusCode: axiosError.response.status,
      };
    }
    
    return {
      success: false,
      error: `Network error: ${axiosError.message}`,
      statusCode: 500,
    };
  }
}

export interface MeetingData {
  condition: string;
  transcribe: boolean;
  transcript: string;
  metadata: {
    date: string;
    membersPresent: string;
    absentWithApology: string;
  };
}

export async function sendMeetingDataToWebhook(
  meetingData: MeetingData
): Promise<TranscriptionResult> {
  const settings = getSettings();
  
  if (!settings.webhookUrl) {
    return {
      success: false,
      error: 'No webhook URL configured. Set one in Settings.',
    };
  }
  
  const form = new FormData();
  form.append('condition', meetingData.condition);
  form.append('transcribe', String(meetingData.transcribe));
  form.append('transcript', meetingData.transcript);
  form.append('metadata', JSON.stringify(meetingData.metadata));
  
  try {
    const timeout = settings.requestTimeoutMs > 0 ? settings.requestTimeoutMs : undefined;
    
    const response = await axios.post(settings.webhookUrl, form, {
      headers: form.getHeaders(),
      timeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    
    if (axiosError.code === 'ECONNABORTED') {
      return {
        success: false,
        error: `The request timed out after ${settings.requestTimeoutMs}ms.`,
        statusCode: 408,
      };
    }
    
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      return {
        success: false,
        error: `Could not reach the webhook URL.`,
        statusCode: 502,
      };
    }
    
    if (axiosError.response) {
      return {
        success: false,
        error: `n8n responded with status ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`,
        statusCode: axiosError.response.status,
      };
    }
    
    return {
      success: false,
      error: `Network error: ${axiosError.message}`,
      statusCode: 500,
    };
  }
}