import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { ProcessingState } from './components/ProcessingState';
import { TranscriptView } from './components/TranscriptView';
import { SettingsPanel } from './components/SettingsPanel';
import { MeetingForm } from './components/MeetingForm';
import { SplitView } from './components/SplitView';
import { createTranscriptionClient } from './lib/transcriptionClient';
import { extractTranscript } from './lib/transcriptExtract';
import { UploadState, CompressionQuality, MeetingMetadata, ProcessingStep } from './types/transcript';
import './App.css';

const transcriptionClient = createTranscriptionClient();

function App() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    elapsedSeconds: 0,
    isRawView: false,
    compressionQuality: 'none',
    mode: 'transcribe',
    meetingMetadata: { date: '', membersPresent: '', absentWithApology: '' },
    storedTranscript: '',
    originalTranscript: undefined,
    originalFile: undefined,
    processingStep: undefined,
    startTime: undefined,
    endTime: undefined,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedTranscript = sessionStorage.getItem('meetingTranscript');
    const savedOriginal = sessionStorage.getItem('originalTranscript');
    const lastActiveTime = sessionStorage.getItem('lastActiveTime');
    
    if (lastActiveTime) {
      const elapsed = Date.now() - parseInt(lastActiveTime, 10);
      if (elapsed > 30 * 60 * 1000) {
        sessionStorage.clear();
        return;
      }
    }
    
    if (savedTranscript) {
      setUploadState(prev => ({
        ...prev,
        storedTranscript: savedTranscript,
        mode: 'meeting',
        originalTranscript: savedOriginal || undefined
      }));
    }
  }, []);

  useEffect(() => {
    const updateActiveTime = () => {
      sessionStorage.setItem('lastActiveTime', Date.now().toString());
    };
    
    updateActiveTime();
    window.addEventListener('focus', updateActiveTime);
    
    return () => {
      window.removeEventListener('focus', updateActiveTime);
    };
  }, []);

  const checkWebhook = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const settings = await res.json();
      const configured = !!settings.webhookUrl;
      setWebhookConfigured(configured);
      return configured;
    } catch {
      setWebhookConfigured(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkWebhook();
  }, [checkWebhook]);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setUploadState(prev => ({ ...prev, status: 'idle', error: undefined }));
  };

  const handleCompressionChange = (quality: CompressionQuality) => {
    setUploadState(prev => ({ ...prev, compressionQuality: quality }));
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    const configured = await checkWebhook();
    if (!configured) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: 'No webhook URL configured. Set one in Settings.',
      }));
      return;
    }

    const startTime = Date.now();
    setUploadState(prev => ({
      ...prev,
      status: 'processing',
      processingStep: uploadState.compressionQuality !== 'none' ? 'compressing' : 'transcribing',
      originalFile: selectedFile,
      startTime,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const uploadResult = await transcriptionClient.submit(
        selectedFile,
        controller.signal,
        uploadState.compressionQuality
      );

      setUploadState(prev => ({
        ...prev,
        requestId: uploadResult.requestId,
        processingStep: uploadResult.status === 'compressing' ? 'compressing' : 'transcribing',
        compressedFileUrl: uploadResult.compressedFileUrl,
      }));

      let pollResult: { status: string; compressedFileUrl?: string; result?: unknown; error?: string } = { status: uploadResult.status };
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        pollResult = await transcriptionClient.poll(uploadResult.requestId, controller.signal);
        
        if (pollResult.compressedFileUrl && pollResult.compressedFileUrl !== uploadResult.compressedFileUrl) {
          setUploadState(prev => ({
            ...prev,
            compressedFileUrl: pollResult.compressedFileUrl,
            processingStep: 'transcribing',
          }));
        }
      } while (pollResult.status === 'compressing' || pollResult.status === 'transcribing');

      const endTime = Date.now();

      if (pollResult.status === 'complete' && pollResult.result) {
        const { text, isUnrecognized } = extractTranscript(pollResult.result);
        setUploadState(prev => ({
          ...prev,
          status: 'done',
          result: text,
          isRawView: false,
          endTime,
          processingStep: 'complete',
        }));
      } else {
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: pollResult.error || 'Transcription failed',
          endTime,
          processingStep: undefined,
        }));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setUploadState(prev => ({ ...prev, status: 'idle', processingStep: undefined }));
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        processingStep: undefined,
      }));
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setUploadState(prev => ({ ...prev, status: 'idle', processingStep: undefined }));
  };

  const handleRetry = () => {
    setUploadState(prev => ({ ...prev, status: 'idle', error: undefined, processingStep: undefined }));
  };

  const handleReset = () => {
    setSelectedFile(null);
    sessionStorage.clear();
    setUploadState({
      status: 'idle',
      elapsedSeconds: 0,
      isRawView: false,
      compressionQuality: 'none',
      mode: 'transcribe',
      meetingMetadata: { date: '', membersPresent: '', absentWithApology: '' },
      storedTranscript: '',
      originalTranscript: undefined,
      originalFile: undefined,
      processingStep: undefined,
      startTime: undefined,
      endTime: undefined,
      compressedFileUrl: undefined,
      requestId: undefined,
    });
  };

  const handleModeChange = (mode: 'transcribe' | 'meeting') => {
    if (mode !== uploadState.mode) {
      sessionStorage.removeItem('meetingTranscript');
      sessionStorage.removeItem('originalTranscript');
      setUploadState(prev => ({
        ...prev,
        mode,
        storedTranscript: '',
        originalTranscript: undefined,
        meetingMetadata: { date: '', membersPresent: '', absentWithApology: '' },
      }));
    }
  };

  const handleMeetingSubmit = async (transcript: string, metadata: MeetingMetadata) => {
    sessionStorage.setItem('meetingTranscript', transcript);

    const configured = await checkWebhook();
    if (!configured) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: 'No webhook URL configured. Set one in Settings.',
      }));
      return;
    }

    const startTime = Date.now();
    setUploadState(prev => ({
      ...prev,
      status: 'processing',
      meetingMetadata: metadata,
      processingStep: 'writing-minutes',
      storedTranscript: transcript,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await transcriptionClient.submitMeeting(transcript, metadata, controller.signal);

      const endTime = Date.now();
      setUploadState(prev => ({
        ...prev,
        status: 'done',
        result: result.transcript,
        isRawView: false,
        storedTranscript: transcript,
        endTime,
        processingStep: 'complete',
      }));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setUploadState(prev => ({ ...prev, status: 'idle', processingStep: undefined }));
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        processingStep: undefined,
      }));
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleResendForMeeting = () => {
    if (uploadState.result) {
      sessionStorage.setItem('meetingTranscript', uploadState.result);
      sessionStorage.setItem('originalTranscript', uploadState.result);
      setUploadState(prev => ({
        ...prev,
        status: 'idle',
        mode: 'meeting',
        storedTranscript: uploadState.result || '',
        originalTranscript: uploadState.result,
      }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeTaken = (startTime?: number, endTime?: number): string => {
    if (!startTime || !endTime) return '';
    const seconds = Math.round((endTime - startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const timeTaken = formatTimeTaken(uploadState.startTime, uploadState.endTime);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Minutes Transcriber</h1>
        <button className="settings-button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </header>

      <main className="app-main">
        {uploadState.status === 'idle' && (
          <>
            <div className="mode-selector">
              <button
                className={`mode-button ${uploadState.mode === 'transcribe' ? 'active' : ''}`}
                onClick={() => handleModeChange('transcribe')}
              >
                Audio Upload
              </button>
              <button
                className={`mode-button ${uploadState.mode === 'meeting' ? 'active' : ''}`}
                onClick={() => handleModeChange('meeting')}
              >
                Meeting Minutes
              </button>
            </div>

            {uploadState.mode === 'transcribe' ? (
              <>
                <UploadZone
                  onFileSelected={handleFileSelected}
                  compressionQuality={uploadState.compressionQuality}
                  onCompressionChange={handleCompressionChange}
                />

                {selectedFile && (
                  <div className="selected-file">
                    <p>
                      <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
                    </p>
                    <button
                      className="submit-button"
                      onClick={handleSubmit}
                      disabled={webhookConfigured === false}
                    >
                      Send for Transcription
                    </button>
                    {webhookConfigured === false && (
                      <p className="webhook-warning">
                        No webhook URL configured. Set one in Settings.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <MeetingForm
                onSubmit={handleMeetingSubmit}
                storedTranscript={uploadState.storedTranscript}
                storedMetadata={uploadState.meetingMetadata}
              />
            )}
          </>
        )}

        {uploadState.status === 'uploading' && (
          <div className="uploading-state">
            <p>Uploading file...</p>
          </div>
        )}

        {uploadState.status === 'processing' && (
          <ProcessingState 
            onCancel={handleCancel} 
            step={uploadState.processingStep}
            compressedFileUrl={uploadState.compressedFileUrl}
          />
        )}

        {uploadState.status === 'done' && uploadState.result && (
          uploadState.mode === 'meeting' && uploadState.originalTranscript ? (
            <SplitView
              originalTranscript={uploadState.originalTranscript}
              meetingMinutes={uploadState.result}
              onReset={handleReset}
              timeTaken={timeTaken}
            />
          ) : (
            <TranscriptView
              transcript={uploadState.result}
              isUnrecognized={uploadState.isRawView}
              onReset={handleReset}
              mode={uploadState.mode}
              onResendForMeeting={handleResendForMeeting}
              originalFile={uploadState.originalFile}
              timeTaken={timeTaken}
            />
          )
        )}

        {uploadState.status === 'error' && (
          <div className="error-state">
            <p className="error-message">{uploadState.error}</p>
            {selectedFile && uploadState.mode === 'transcribe' && (
              <p className="retry-info">
                <strong>{selectedFile.name}</strong> is ready to retry ({uploadState.compressionQuality === 'none' ? 'no compression' : uploadState.compressionQuality})
              </p>
            )}
            {uploadState.mode === 'meeting' && uploadState.storedTranscript && (
              <p className="retry-info">
                Transcript and meeting details are ready to retry
              </p>
            )}
            <div className="error-actions">
              <button className="retry-button" onClick={handleRetry}>
                Try Again
              </button>
              <button className="reset-button-secondary" onClick={handleReset}>
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
