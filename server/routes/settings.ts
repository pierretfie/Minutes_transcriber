import { Router, Request, Response } from 'express';
import { getSettings, updateSettings } from '../lib/config.js';

const router = Router();

router.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

router.put('/settings', (req: Request, res: Response) => {
  try {
    const partial = req.body;
    
    if (partial.webhookUrl !== undefined && typeof partial.webhookUrl !== 'string') {
      res.status(400).json({ error: 'webhookUrl must be a string' });
      return;
    }
    
    if (partial.webhookMode !== undefined && !['test', 'production'].includes(partial.webhookMode)) {
      res.status(400).json({ error: 'webhookMode must be "test" or "production"' });
      return;
    }
    
    if (partial.requestTimeoutMs !== undefined && typeof partial.requestTimeoutMs !== 'number') {
      res.status(400).json({ error: 'requestTimeoutMs must be a number' });
      return;
    }
    
    const updated = updateSettings(partial);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
