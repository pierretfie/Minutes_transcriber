import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppMode } from '../types/transcript';
import { convertMarkdownToDocx } from '../lib/markdownToDocx';

interface TranscriptViewProps {
  transcript: string;
  isUnrecognized: boolean;
  onReset: () => void;
  mode: AppMode;
  onResendForMeeting?: () => void;
  originalFile?: File;
  timeTaken?: string;
}

export function TranscriptView({ transcript, isUnrecognized, onReset, mode, onResendForMeeting, originalFile, timeTaken }: TranscriptViewProps) {
  const [isRaw, setIsRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(null), 2000);
    }
  };
  
  const handleDownloadMd = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const filename = `transcript-${timestamp}.md`;
    
    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      const blob = await convertMarkdownToDocx(transcript);
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const filename = `transcript-${timestamp}.docx`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate DOCX');
      setTimeout(() => setError(null), 2000);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAudio = () => {
    if (!originalFile) return;
    
    const url = URL.createObjectURL(originalFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="transcript-view">
      {isUnrecognized && (
        <div className="warning-banner">
          Warning: The response shape was unrecognized. Formatting may look off.
        </div>
      )}

      {timeTaken && (
        <div className="time-taken-banner">
          Processed in {timeTaken}
        </div>
      )}
      
      <div className="transcript-controls">
        <div className="view-toggle">
          <button 
            className={!isRaw ? 'active' : ''} 
            onClick={() => setIsRaw(false)}
          >
            Rendered
          </button>
          <button 
            className={isRaw ? 'active' : ''} 
            onClick={() => setIsRaw(true)}
          >
            Raw Markdown
          </button>
        </div>
        
        {error && (
          <div className="error-banner" style={{ color: 'red', marginBottom: '0.5rem' }}>
            {error}
          </div>
        )}
        
        <div className="action-buttons">
          {originalFile && (
            <button className="download-audio-button" onClick={handleDownloadAudio}>
              Save Audio
            </button>
          )}
          <button className="copy-button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="download-button" onClick={handleDownloadMd}>
            .md
          </button>
          <button 
            className="download-docx-button" 
            onClick={handleDownloadDocx}
            disabled={downloading}
          >
            {downloading ? '...' : '.docx'}
          </button>
        </div>
      </div>
      
      <div className="transcript-content">
        {isRaw ? (
          <pre className="raw-markdown">{transcript}</pre>
        ) : (
          <div className="rendered-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{transcript}</ReactMarkdown>
          </div>
        )}
      </div>

      {mode === 'transcribe' && onResendForMeeting && (
        <div className="cta-section">
          <button className="cta-button" onClick={onResendForMeeting}>
            Resend for Complete Minute Writing
          </button>
        </div>
      )}
      
      <button className="reset-button" onClick={onReset}>
        Start new transcription
      </button>
    </div>
  );
}