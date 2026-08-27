import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type Bitrate = '32k' | '16k';

export interface CompressResult {
  buffer: Buffer;
  outputPath: string;
}

export async function compressAudio(
  inputPath: string,
  bitrate: Bitrate
): Promise<CompressResult> {
  const tempId = randomBytes(16).toString('hex');
  const outputPath = join(tmpdir(), `compressed-${tempId}.m4a`);
  
  try {
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-ac', '1',
      '-ar', '16000',
      '-b:a', bitrate,
      '-y',
      outputPath
    ], { timeout: 300000 }); // 5 minute timeout
    
    const buffer = await readFile(outputPath);
    return { buffer, outputPath };
  } catch (error) {
    const err = error as { code?: string; stderr?: string };
    
    if (err.code === 'ENOENT') {
      throw new Error('Audio compression unavailable. Install ffmpeg.');
    }
    
    if (err.code === 'ETIMEDOUT') {
      throw new Error('Audio compression timed out. File may be too large.');
    }
    
    throw new Error(`Audio compression failed: ${err.stderr || 'Unknown error'}`);
  }
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}
