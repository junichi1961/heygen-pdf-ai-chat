import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { getStatus } from '../lib/api';
import type { StatusInfo } from '../types';

interface SettingsContextValue {
  model: string;
  setModel: (m: string) => void;
  ragEnabled: boolean;
  setRagEnabled: (v: boolean) => void;
  autoAvatar: boolean;
  setAutoAvatar: (v: boolean) => void;
  /** サーバーの接続状況（未取得なら null） */
  status: StatusInfo | null;
  refreshStatus: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const LS_KEY = 'nexusai.settings';

function loadPersisted(): Partial<SettingsContextValue> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersisted();
  const [model, setModel] = useState<string>(persisted.model ?? 'claude-opus-4-8');
  const [ragEnabled, setRagEnabled] = useState<boolean>(persisted.ragEnabled ?? false);
  const [autoAvatar, setAutoAvatar] = useState<boolean>(persisted.autoAvatar ?? false);
  const [status, setStatus] = useState<StatusInfo | null>(null);

  // 設定はローカルに永続化（APIキーは含めない）
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ model, ragEnabled, autoAvatar }));
  }, [model, ragEnabled, autoAvatar]);

  const refreshStatus = useCallback(() => {
    getStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <SettingsContext.Provider
      value={{
        model,
        setModel,
        ragEnabled,
        setRagEnabled,
        autoAvatar,
        setAutoAvatar,
        status,
        refreshStatus,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings は SettingsProvider の内側で使ってください');
  return ctx;
}
