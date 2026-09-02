import React, { useCallback, useRef, useState } from 'react';
import { CompressionQuality } from '../types/transcript';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  compressionQuality: CompressionQuality;
  onCompressionChange: (quality: CompressionQuality) => void;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.opus'];

export function UploadZone({ 
  onFileSelected, 
  compressionQuality, 
  onCompressionChange,
  disabled = false 
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type. Accepted formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    setError(null);
    return true;
  };
  
  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onFileSelected(file);
    }
  }, [onFileSelected]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);
  
  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };
  
  return (
    <>
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />
        <div className="upload-content">
          <span className="upload-icon">📁</span>
          <p>Drag and drop an audio file here, or click to browse</p>
          <p className="upload-hint">Accepted formats: {ALLOWED_EXTENSIONS.join(', ')}</p>
        </div>
        {error && <p className="upload-error">{error}</p>}
      </div>
      
      <div className="processing-grid">
        <div className="compression-selector">
          <p className="compression-label">Compression</p>
          <label className="compression-option">
            <input
              type="radio"
              name="compression"
              value="none"
              checked={compressionQuality === 'none'}
              onChange={() => onCompressionChange('none')}
            />
          <span className="compression-title">No processing</span>
          <span className="compression-desc">Send as-is, no changes — original codec / sample rate</span>
          </label>
          <label className="compression-option">
            <input
              type="radio"
              name="compression"
              value="32k"
              checked={compressionQuality === '32k'}
              onChange={() => onCompressionChange('32k')}
            />
            <span className="compression-title">Standard (32 kbps) <span className="recommended-badge">(Recommended)</span></span>
            <span className="compression-desc">16kHz mono AAC 32k — smaller file, clear recordings</span>
          </label>
          <label className="compression-option">
            <input
              type="radio"
              name="compression"
              value="16k"
              checked={compressionQuality === '16k'}
              onChange={() => onCompressionChange('16k')}
            />
            <span className="compression-title">High Clarity (16 kbps)</span>
            <span className="compression-desc">16kHz mono AAC 16k — better for noisy rooms, multiple speakers</span>
          </label>
        </div>

        <div className="compression-selector">
          <p className="compression-label">Denoised processing</p>
          <label className="compression-option">
            <input
              type="radio"
              name="compression"
              value="denoise"
              checked={compressionQuality === 'denoise'}
              onChange={() => onCompressionChange('denoise')}
            />
            <span className="compression-title">Denoise only</span>
            <span className="compression-desc">arnndn (std.rnnn) → 48kHz mono Opus 64k — noise removed, high quality</span>
          </label>
          <label className="compression-option">
            <input
              type="radio"
              name="compression"
              value="compressed-denoised"
              checked={compressionQuality === 'compressed-denoised'}
              onChange={() => onCompressionChange('compressed-denoised')}
            />
            <span className="compression-title">Compressed + Denoised <span className="recommended-badge">(Recommended)</span></span>
            <span className="compression-desc">arnndn (std.rnnn) → 24kHz mono Opus 32k — noise removed + compressed, best overall</span>
          </label>
        </div>
      </div>
    </>
  );
}
