// アプリ全体で共有する型定義。

export type ChatRole = 'user' | 'assistant';

export interface QuoteItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface QuoteDraft {
  companyName?: string;
  contactName?: string;
  items: QuoteItem[];
  notes?: string;
}

/** RAG 検索で返る根拠チャンク */
export interface RagSource {
  title: string;
  score: number;
  excerpt: string;
}

/** 設定画面で選べる Claude モデル（現行の最新モデルID） */
export const CLAUDE_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8（最高性能）' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5（速度と知能のバランス）' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5（最速・低コスト）' },
] as const;

export type ClaudeModelId = (typeof CLAUDE_MODELS)[number]['id'];

/** サーバーの接続状況（/api/status） */
export interface StatusInfo {
  anthropic: boolean;
  heygen: boolean;
  /** サーバーがローカルダミーモードで動いているか */
  mock?: boolean;
  embeddingProvider: string;
  rag: { documents: number; chunks: number };
  defaultModel: string;
}

/** クライアント側に保持する設定（APIキーは含めない＝サーバーの .env が保持） */
export interface AppSettings {
  model: string;
  ragEnabled: boolean;
  autoAvatar: boolean;
}
