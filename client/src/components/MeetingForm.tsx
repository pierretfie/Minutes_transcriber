import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MeetingMetadata } from '../types/transcript';

interface MeetingFormProps {
  onSubmit: (transcript: string, metadata: MeetingMetadata) => void;
  storedTranscript: string;
  storedMetadata?: MeetingMetadata;
}

const ALLOWED_MD_EXTENSIONS = ['.md', '.txt', '.markdown'];

export function MeetingForm({ onSubmit, storedTranscript, storedMetadata }: MeetingFormProps) {
  const [transcript, setTranscript] = useState(storedTranscript);
  const [metadata, setMetadata] = useState<MeetingMetadata>(
    storedMetadata || {
      date: '',
      membersPresent: '',
      absentWithApology: ''
    }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTranscript(storedTranscript);
  }, [storedTranscript]);

  useEffect(() => {
    if (storedMetadata) {
      setMetadata(storedMetadata);
    }
  }, [storedMetadata]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_MD_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type. Accepted formats: ${ALLOWED_MD_EXTENSIONS.join(', ')}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setTranscript(content);
      setError(null);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleMetadataChange = (field: keyof MeetingMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!transcript.trim()) {
      setError('Please provide a transcript (paste or upload a file)');
      return;
    }
    if (!metadata.date.trim()) {
      setError('Please enter the meeting date');
      return;
    }
    if (!metadata.membersPresent.trim()) {
      setError('Please enter members present');
      return;
    }
    setError(null);
    onSubmit(transcript, metadata);
  };

  const isFormValid = transcript.trim() && metadata.date.trim() && metadata.membersPresent.trim();

  return (
    <div className="meeting-form">
      <div className="meeting-form-header">
        <h2>Meeting Minutes</h2>
        <p className="meeting-form-hint">Paste or upload an existing transcript, then provide meeting details</p>
      </div>

      <div className="transcript-input-section">
        <label className="form-label">Transcript</label>
        <div
          className={`transcript-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MD_EXTENSIONS.join(',')}
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          <div className="dropzone-content">
            <span className="dropzone-icon">📄</span>
            <p>Drag and drop a .md/.txt file, or click to browse</p>
            <p className="dropzone-hint">Or paste your transcript below</p>
          </div>
        </div>
        
        <textarea
          className="transcript-textarea"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste your transcript here..."
          rows={10}
        />
        
        {transcript && (
          <button 
            className="preview-toggle"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        )}
        
        {showPreview && transcript && (
          <div className="transcript-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{transcript}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="metadata-section">
        <h3>Meeting Details</h3>
        
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            type="date"
            className="form-input"
            value={metadata.date}
            onChange={(e) => handleMetadataChange('date', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Members Present *</label>
          <textarea
            className="form-textarea"
            value={metadata.membersPresent}
            onChange={(e) => handleMetadataChange('membersPresent', e.target.value)}
            placeholder="Enter names separated by commas (e.g., John Smith, Jane Doe, Bob Wilson)"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Absent with Apology</label>
          <textarea
            className="form-textarea"
            value={metadata.absentWithApology}
            onChange={(e) => handleMetadataChange('absentWithApology', e.target.value)}
            placeholder="Enter names separated by commas (optional)"
            rows={2}
          />
        </div>
      </div>

      {error && <p className="meeting-form-error">{error}</p>}

      <button
        className="submit-button meeting-submit"
        onClick={handleSubmit}
        disabled={!isFormValid}
      >
        Generate Meeting Minutes
      </button>
    </div>
  );
}
