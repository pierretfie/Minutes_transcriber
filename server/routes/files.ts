import { Router, Request, Response } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, createReadStream, unlinkSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

const COMPRESSED_DIR = join(__dirname, '..', 'compressed');

router.get('/files/compressed/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename || filename.includes('..') || filename.includes('/')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = join(COMPRESSED_DIR, filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.setHeader('Content-Type', 'audio/m4a');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  const stream = createReadStream(filePath);
  stream.pipe(res);
});

router.delete('/files/compressed/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename || filename.includes('..') || filename.includes('/')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = join(COMPRESSED_DIR, filename);

  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  res.json({ success: true });
});

export default router;
