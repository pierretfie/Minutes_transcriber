import { useEffect, useState } from 'react';
import { ProcessingStep } from '../types/transcript';

interface ProcessingStateProps {
  onCancel: () => void;
  step?: ProcessingStep;
  compressedFileUrl?: string | null;
}

const STEP_MESSAGES: Record<ProcessingStep, { message: string; hint: string }> = {
  'uploading': {
    message: 'Uploading audio file...',
    hint: 'Sending your audio to the server.'
  },
  'compressing': {
    message: 'Compressing audio...',
    hint: 'Reducing file size, then transcribing. Please keep this tab open.'
  },
  'transcribing': {
    message: 'Transcribing audio...',
    hint: 'Longer recordings take longer. Please keep this tab open.'
  },
  'writing-minutes': {
    message: 'Writing meeting minutes...',
    hint: 'Generating structured minutes from transcript.'
  },
  'complete': {
    message: 'Processing complete!',
    hint: 'Preparing results.'
  }
};

export function ProcessingState({ onCancel, step = 'transcribing', compressedFileUrl }: ProcessingStateProps) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  
  const stepInfo = STEP_MESSAGES[step] || STEP_MESSAGES['transcribing'];
  
  return (
    <div className="processing-state">
      <div className="processing-spinner"></div>
      <p className="processing-elapsed">{stepInfo.message} {minutes}:{seconds}</p>
      <p className="processing-hint">{stepInfo.hint}</p>
      
      <div className="processing-actions">
        {compressedFileUrl && step === 'transcribing' && (
          <a 
            href={compressedFileUrl} 
            download 
            className="download-compressed-button"
          >
            Download Compressed Audio
          </a>
        )}
        
        <button className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
