import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertMarkdownToDocx } from '../lib/markdownToDocx';

interface SplitViewProps {
  originalTranscript: string;
  meetingMinutes: string;
  onReset: () => void;
  timeTaken?: string;
}

export function SplitView({ originalTranscript, meetingMinutes, onReset, timeTaken }: SplitViewProps) {
  const [activeTab, setActiveTab] = useState<'transcription' | 'minutes'>('minutes');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleDownloadMd = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async (text: string, filename: string) => {
    setDownloading(true);
    try {
      const blob = await convertMarkdownToDocx(text);
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

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);

  return (
    <div className="split-view">
      {timeTaken && (
        <div className="time-taken-banner">
          Processed in {timeTaken}
        </div>
      )}

      <div className="split-tabs">
        <button
          className={`split-tab ${activeTab === 'transcription' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcription')}
        >
          Original Transcription
        </button>
        <button
          className={`split-tab ${activeTab === 'minutes' ? 'active' : ''}`}
          onClick={() => setActiveTab('minutes')}
        >
          Meeting Minutes
        </button>
      </div>

      {error && (
        <div className="error-banner" style={{ color: 'red', padding: '0.5rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div className="split-content">
        {activeTab === 'transcription' && (
          <div className="split-panel">
            <div className="panel-controls">
              <span className="panel-label">Transcription (Run 1)</span>
              <div className="panel-actions">
                <button className="copy-button" onClick={() => handleCopy(originalTranscript)}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  className="download-button"
                  onClick={() => handleDownloadMd(originalTranscript, `transcription-${timestamp}.md`)}
                >
                  .md
                </button>
                <button
                  className="download-docx-button"
                  onClick={() => handleDownloadDocx(originalTranscript, `transcription-${timestamp}.docx`)}
                  disabled={downloading}
                >
                  {downloading ? '...' : '.docx'}
                </button>
              </div>
            </div>
            <div className="panel-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{originalTranscript}</ReactMarkdown>
            </div>
          </div>
        )}

        {activeTab === 'minutes' && (
          <div className="split-panel">
            <div className="panel-controls">
              <span className="panel-label">Meeting Minutes (Run 2)</span>
              <div className="panel-actions">
                <button className="copy-button" onClick={() => handleCopy(meetingMinutes)}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  className="download-button"
                  onClick={() => handleDownloadMd(meetingMinutes, `minutes-${timestamp}.md`)}
                >
                  .md
                </button>
                <button
                  className="download-docx-button"
                  onClick={() => handleDownloadDocx(meetingMinutes, `minutes-${timestamp}.docx`)}
                  disabled={downloading}
                >
                  {downloading ? '...' : '.docx'}
                </button>
              </div>
            </div>
            <div className="panel-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{meetingMinutes}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <button className="reset-button" onClick={onReset}>
        Start new transcription
      </button>
    </div>
  );
}
