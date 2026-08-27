import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_DIR = join(__dirname, '..', '..', 'config');
const CONFIG_PATH = join(CONFIG_DIR, 'settings.json');

export interface Settings {
  webhookUrl: string;
  webhookMode: 'test' | 'production';
  requestTimeoutMs: number;
  lastUsedAt: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  webhookUrl: '',
  webhookMode: 'test',
  requestTimeoutMs: 0,
  lastUsedAt: null,
};

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getSettings(): Settings {
  ensureConfigDir();
  
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return { ...DEFAULT_SETTINGS };
  }
  
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
  };
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = getSettings();
  const updated = { ...current, ...partial };
  
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  
  return updated;
}