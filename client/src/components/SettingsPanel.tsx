import { useState, useEffect } from 'react';
import { Settings } from '../types/settings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    webhookUrl: '',
    webhookMode: 'test',
    requestTimeoutMs: 0,
    lastUsedAt: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => setSettings(data))
        .catch(() => setError('Failed to load settings'));
    }
  }, [isOpen]);
  
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save settings');
      }
      
      const updated = await res.json();
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="setting-group">
            <label htmlFor="webhookUrl">Webhook URL</label>
            <input
              id="webhookUrl"
              type="url"
              value={settings.webhookUrl}
              onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder="https://your-n8n-instance.com/webhook/..."
            />
          </div>
          
          <div className="setting-group">
            <label htmlFor="webhookMode">Mode</label>
            <select
              id="webhookMode"
              value={settings.webhookMode}
              onChange={e => setSettings({ ...settings, webhookMode: e.target.value as 'test' | 'production' })}
            >
              <option value="test">Test</option>
              <option value="production">Production</option>
            </select>
            {settings.webhookMode === 'test' && (
              <p className="setting-hint">Test mode: Use n8n's test webhook URL</p>
            )}
          </div>
          
          <div className="setting-group">
            <label htmlFor="timeout">Request Timeout (ms)</label>
            <input
              id="timeout"
              type="number"
              value={settings.requestTimeoutMs}
              onChange={e => setSettings({ ...settings, requestTimeoutMs: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <p className="setting-hint">0 = no timeout (recommended for long recordings)</p>
          </div>
          
          {settings.lastUsedAt && (
            <div className="setting-group">
              <label>Last Used</label>
              <p className="last-used">{new Date(settings.lastUsedAt).toLocaleString()}</p>
            </div>
          )}
          
          {error && <p className="settings-error">{error}</p>}
          
          <div className="settings-actions">
            <button 
              className="save-button" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
