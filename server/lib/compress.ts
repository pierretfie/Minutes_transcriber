import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { getSettings } from './config.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve model path: server/lib -> project root -> arnndn-models/std.rnnn
const DEFAULT_MODEL_PATH = resolve(__dirname, '..', '..', 'arnndn-models', 'std.rnnn');

function getModelPath(): string {
  try {
    const custom = getSettings().arnndnModelPath;
    if (custom && existsSync(custom)) return custom;
  } catch {}
  if (existsSync(DEFAULT_MODEL_PATH)) return DEFAULT_MODEL_PATH;
  // Fallback to absolute as seen on this machine
  const fallback = '/home/maina/Documents/Minutes_transcriber/arnndn-models/std.rnnn';
  if (existsSync(fallback)) return fallback;
  return DEFAULT_MODEL_PATH;
}

export type Bitrate = '32k' | '16k';
export type ProcessingMode = '32k' | '16k' | 'denoise' | 'compressed-denoised';

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
      throw new Error('Audio processing unavailable. Install ffmpeg.');
    }
    
    if (err.code === 'ETIMEDOUT') {
      throw new Error('Audio processing timed out. File may be too large.');
    }
    
    throw new Error(`Audio compression failed: ${err.stderr || 'Unknown error'}`);
  }
}

export async function denoiseAudio(
  inputPath: string
): Promise<CompressResult> {
  const tempId = randomBytes(16).toString('hex');
  const outputPath = join(tmpdir(), `denoised-${tempId}.opus`);
  const modelPath = getModelPath();
  
  try {
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-af', `arnndn=m=${modelPath}`,
      '-ac', '1',
      '-ar', '48000',
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-y',
      outputPath
    ], { timeout: 300000 });
    
    const buffer = await readFile(outputPath);
    return { buffer, outputPath };
  } catch (error) {
    const err = error as { code?: string; stderr?: string };
    if (err.code === 'ENOENT') throw new Error('Denoising unavailable. Install ffmpeg with arnndn support.');
    if (err.code === 'ETIMEDOUT') throw new Error('Denoising timed out. File may be too large.');
    throw new Error(`Denoising failed: ${err.stderr || 'Unknown error'}`);
  }
}

export async function denoiseAndCompressAudio(
  inputPath: string
): Promise<CompressResult> {
  const tempId = randomBytes(16).toString('hex');
  const outputPath = join(tmpdir(), `denoised-compressed-${tempId}.opus`);
  const modelPath = getModelPath();
  
  try {
    await execFileAsync('ffmpeg', [
      '-i', inputPath,
      '-af', `arnndn=m=${modelPath}`,
      '-ac', '1',
      '-ar', '24000',
      '-c:a', 'libopus',
      '-b:a', '32k',
      '-y',
      outputPath
    ], { timeout: 300000 });
    
    const buffer = await readFile(outputPath);
    return { buffer, outputPath };
  } catch (error) {
    const err = error as { code?: string; stderr?: string };
    if (err.code === 'ENOENT') throw new Error('Denoising unavailable. Install ffmpeg with arnndn support.');
    if (err.code === 'ETIMEDOUT') throw new Error('Denoising timed out. File may be too large.');
    throw new Error(`Denoise+compress failed: ${err.stderr || 'Unknown error'}`);
  }
}

export async function processAudio(
  inputPath: string,
  mode: ProcessingMode
): Promise<CompressResult> {
  switch (mode) {
    case '32k':
    case '16k':
      return compressAudio(inputPath, mode);
    case 'denoise':
      return denoiseAudio(inputPath);
    case 'compressed-denoised':
      return denoiseAndCompressAudio(inputPath);
    default:
      throw new Error(`Unknown processing mode: ${mode}`);
  }
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}
