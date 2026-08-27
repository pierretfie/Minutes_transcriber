import { Router, Request, Response } from 'express';
import { sendToWebhook, sendMeetingDataToWebhook, MeetingData } from '../lib/n8nClient.js';
import { updateSettings } from '../lib/config.js';
import { compressAudio, cleanupFile, Bitrate } from '../lib/compress.js';
import { writeFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const COMPRESSED_DIR = join(__dirname, '..', 'compressed');

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
];

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'];

interface PendingRequest {
  id: string;
  status: 'compressing' | 'transcribing' | 'complete' | 'error';
  compressedFileUrl?: string;
  result?: unknown;
  error?: string;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();

router.post('/transcribe', async (req: Request, res: Response) => {
  const { transcribe } = req.body;
  const shouldTranscribe = transcribe !== 'false';

  if (shouldTranscribe) {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Field name must be "file".' });
      return;
    }

    const { bitrate } = req.body;
    const shouldCompress = bitrate && bitrate !== 'none';

    if (shouldCompress && !['32k', '16k'].includes(bitrate)) {
      res.status(400).json({ error: 'Invalid bitrate. Must be "none", "32k", or "16k".' });
      return;
    }

    const file = req.file;

    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeValid && !isExtValid) {
      res.status(400).json({ 
        error: `Invalid file type. Accepted formats: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
      return;
    }

    const requestId = randomBytes(16).toString('hex');
    
    const pendingRequest: PendingRequest = {
      id: requestId,
      status: shouldCompress ? 'compressing' : 'transcribing',
    };
    pendingRequests.set(requestId, pendingRequest);

    res.json({
      requestId,
      status: pendingRequest.status,
      compressedFileUrl: null,
    });

    let tempInputPath: string | null = null;
    let compressedPath: string | null = null;
    let savedCompressedFilename: string | null = null;

    try {
      let bufferToSend = file.buffer;
      let filenameToSend = file.originalname;
      let mimeToSend = file.mimetype;

      if (shouldCompress) {
        const tempId = randomBytes(16).toString('hex');
        tempInputPath = join(tmpdir(), `upload-${tempId}${ext}`);
        await writeFile(tempInputPath, file.buffer);

        const result = await compressAudio(tempInputPath, bitrate as Bitrate);
        compressedPath = result.outputPath;

        bufferToSend = result.buffer;
        filenameToSend = file.originalname.replace(/\.[^.]+$/, '.m4a');
        mimeToSend = 'audio/m4a';

        const compressedId = randomBytes(16).toString('hex');
        savedCompressedFilename = `compressed-${compressedId}.m4a`;
        const savedPath = join(COMPRESSED_DIR, savedCompressedFilename);
        await writeFile(savedPath, result.buffer);

        pendingRequest.status = 'transcribing';
        pendingRequest.compressedFileUrl = `/api/files/compressed/${savedCompressedFilename}`;
      }

      const webhookResult = await sendToWebhook(
        bufferToSend,
        filenameToSend,
        mimeToSend,
        { transcribe: 'true', condition: 'transcribe' }
      );

      if (webhookResult.success) {
        updateSettings({ lastUsedAt: new Date().toISOString() });
        pendingRequest.status = 'complete';
        pendingRequest.result = webhookResult.data;
      } else {
        pendingRequest.status = 'error';
        pendingRequest.error = webhookResult.error;
      }

      pendingRequest.cleanupTimer = setTimeout(() => {
        if (savedCompressedFilename) {
          const savedPath = join(COMPRESSED_DIR, savedCompressedFilename);
          unlink(savedPath).catch(() => {});
        }
        pendingRequests.delete(requestId);
      }, 5 * 60 * 1000);

    } catch (error) {
      pendingRequest.status = 'error';
      pendingRequest.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (savedCompressedFilename) {
        const savedPath = join(COMPRESSED_DIR, savedCompressedFilename);
        await unlink(savedPath).catch(() => {});
      }
    } finally {
      if (tempInputPath) await cleanupFile(tempInputPath);
      if (compressedPath) await cleanupFile(compressedPath);
    }
  } else {
    const { transcript, metadata } = req.body;

    if (!transcript) {
      res.status(400).json({ error: 'No transcript provided.' });
      return;
    }

    let parsedMetadata;
    try {
      parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    } catch {
      res.status(400).json({ error: 'Invalid metadata format.' });
      return;
    }

    try {
      const meetingData: MeetingData = {
        condition: 'transcribe',
        transcribe: false,
        transcript,
        metadata: parsedMetadata,
      };

      const webhookResult = await sendMeetingDataToWebhook(meetingData);

      if (webhookResult.success) {
        updateSettings({ lastUsedAt: new Date().toISOString() });
        res.json({ transcript: webhookResult.data });
      } else {
        res.status(webhookResult.statusCode || 500).json({ error: webhookResult.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  }
});

router.get('/transcribe/poll/:requestId', async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const pendingRequest = pendingRequests.get(requestId);

  if (!pendingRequest) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  res.json({
    requestId: pendingRequest.id,
    status: pendingRequest.status,
    compressedFileUrl: pendingRequest.compressedFileUrl || null,
    result: pendingRequest.result || null,
    error: pendingRequest.error || null,
  });
});

export default router;
