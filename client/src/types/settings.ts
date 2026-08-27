export interface Settings {
  webhookUrl: string;
  webhookMode: 'test' | 'production';
  requestTimeoutMs: number;
  lastUsedAt: string | null;
}