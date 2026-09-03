import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import settingsRouter from './routes/settings.js';
import transcribeRouter from './routes/transcribe.js';
import filesRouter from './routes/files.js';
import licenseRouter from './routes/license.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

const clientDistPath = join(__dirname, '..', '..', 'client', 'dist');
const bundleClientPath = join(__dirname, '..', 'client', 'dist');

// Ensure compressed dirs exist for both dev (server/compressed) and bundle (server/dist/compressed)
for (const dir of [join(__dirname, '..', 'compressed'), join(__dirname, 'compressed')]) {
  try { mkdirSync(dir, { recursive: true }); } catch {}
}

let staticPath = clientDistPath;
if (existsSync(bundleClientPath)) {
  staticPath = bundleClientPath;
} else if (existsSync(clientDistPath)) {
  staticPath = clientDistPath;
}

app.use(express.static(staticPath));

app.use('/api', settingsRouter);
app.use('/api', filesRouter);
app.use('/api', upload.single('file'), transcribeRouter);
app.use('/api', licenseRouter);

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(staticPath, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Minutes Transcriber ===`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nNetwork access:`);
  console.log(`  Find your IP: ifconfig | grep "inet " | grep -v 127.0.0.1`);
  console.log(`  Then open: http://YOUR_IP:${PORT}\n`);
});

export default app;