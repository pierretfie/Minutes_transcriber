export interface ExtractResult {
  text: string;
  isUnrecognized: boolean;
}

function cleanTranscriptContent(text: string): string {
  let cleaned = text;
  
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\t/g, '\t');
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\\\/g, '\\');
  
  cleaned = cleaned.replace(/<u>/g, '');
  cleaned = cleaned.replace(/<\/u>/g, '');
  
  cleaned = cleaned.replace(/^(#{1,6})\s*# /gm, '$1 ');
  
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

function extractOutputField(response: unknown): string | null {
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (typeof obj.output === 'string') {
      return obj.output;
    }
    if (typeof obj.transcript === 'string') {
      return obj.transcript;
    }
  }
  return null;
}

export function extractTranscript(response: unknown): ExtractResult {
  if (response === null || response === undefined) {
    return { text: String(response), isUnrecognized: true };
  }
  
  const outputText = extractOutputField(response);
  if (outputText) {
    return { text: cleanTranscriptContent(outputText), isUnrecognized: false };
  }
  
  const obj = response as Record<string, unknown>;
  
  if (obj.content && typeof obj.content === 'object') {
    const content = obj.content as Record<string, unknown>;
    if (Array.isArray(content.parts) && content.parts.length > 0) {
      const firstPart = content.parts[0] as Record<string, unknown>;
      if (typeof firstPart.text === 'string') {
        return { text: cleanTranscriptContent(firstPart.text), isUnrecognized: false };
      }
    }
  }
  
  if (Array.isArray(response) && response.length > 0) {
    const first = response[0] as Record<string, unknown>;
    if (first.content && typeof first.content === 'object') {
      const content = first.content as Record<string, unknown>;
      if (Array.isArray(content.parts) && content.parts.length > 0) {
        const firstPart = content.parts[0] as Record<string, unknown>;
        if (typeof firstPart.text === 'string') {
          return { text: cleanTranscriptContent(firstPart.text), isUnrecognized: false };
        }
      }
    }
  }
  
  const stringResponse = String(response);
  if (stringResponse.includes('\\n') || stringResponse.includes('<u>')) {
    return { text: cleanTranscriptContent(stringResponse), isUnrecognized: false };
  }
  
  return { 
    text: JSON.stringify(response, null, 2), 
    isUnrecognized: true 
  };
}
