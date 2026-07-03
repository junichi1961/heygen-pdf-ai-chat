import 'dotenv/config';
import path from 'node:path';

/**
 * サーバー側の設定を一箇所に集約。APIキーはここ（＝サーバープロセス）にのみ存在し、
 * フロントエンドには決して渡さない。
 */
export const config = {
  port: Number(process.env.PORT ?? 8787),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  defaultModel: process.env.DEFAULT_MODEL ?? 'claude-opus-4-8',

  heygenApiKey: process.env.HEYGEN_API_KEY ?? '',
  heygenAvatarId: process.env.HEYGEN_AVATAR_ID ?? '',

  embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? 'local') as 'local' | 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',

  // MOCK_MODE=1 で強制モック。未指定でも APIキーが無ければ自動でモックに落ちる。
  forceMock: process.env.MOCK_MODE === '1',

  dbPath: process.env.DB_PATH ?? path.resolve(process.cwd(), 'server/data/app.db'),
} as const;

/**
 * ローカルダミーモードで動くか。
 * ANTHROPIC_API_KEY が無い、または MOCK_MODE=1 のときに true。
 */
export function isMockMode(): boolean {
  return config.forceMock || !config.anthropicApiKey;
}

/** フロントの設定画面が選べるモデル（現行の最新モデルIDに統一） */
export const ALLOWED_MODELS = [
  'claude-opus-4-8',
  'claude-sonnet-5',
  'claude-haiku-4-5-20251001',
] as const;

export function resolveModel(requested?: string): string {
  if (requested && (ALLOWED_MODELS as readonly string[]).includes(requested)) {
    return requested;
  }
  return config.defaultModel;
}
