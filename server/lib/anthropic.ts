import Anthropic from '@anthropic-ai/sdk';
import { config } from '../env';

export const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * チャット応答をストリーミングで生成し、テキスト差分を onText で流す。
 * 返り値は最終的な全文。
 */
export async function streamChat(opts: {
  model: string;
  system: string;
  messages: ChatMsg[];
  maxTokens?: number;
  onText: (delta: string) => void;
}): Promise<string> {
  const stream = anthropic.messages.stream({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  stream.on('text', (delta) => opts.onText(delta));

  const final = await stream.finalMessage();
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

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

/**
 * 会話履歴から見積項目を構造化抽出する。
 * ツール（strict スキーマ）＋ tool_choice で JSON を確実に受け取る方式。
 */
export async function generateQuote(opts: {
  model: string;
  messages: ChatMsg[];
}): Promise<QuoteDraft> {
  const tool: Anthropic.Tool = {
    name: 'submit_quote',
    description:
      'これまでの会話内容から、日本円建ての見積書ドラフトを作成して提出する。単価は税抜の整数（円）。',
    input_schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: '見積先の会社名（不明なら空文字）' },
        contactName: { type: 'string', description: '担当者名（不明なら空文字）' },
        items: {
          type: 'array',
          description: '見積項目のリスト（2〜8件程度）',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '項目名' },
              qty: { type: 'integer', description: '数量（1以上）' },
              unitPrice: { type: 'integer', description: '税抜単価（円・整数）' },
            },
            required: ['name', 'qty', 'unitPrice'],
          },
        },
        notes: { type: 'string', description: '備考（任意）' },
      },
      required: ['items'],
    },
  };

  const resp = await anthropic.messages.create({
    model: opts.model,
    max_tokens: 2048,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_quote' },
    system:
      'あなたはSIベンダーの提案担当です。会話の要件をもとに現実的な見積項目・数量・単価を作成します。' +
      '情報が乏しい場合も、一般的なAI基盤構築案件を想定して妥当な項目を提案してください。',
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const block = resp.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
  );
  if (!block) throw new Error('見積の構造化出力を取得できませんでした');

  const draft = block.input as QuoteDraft;
  // 最低限の正規化
  draft.items = (draft.items ?? []).map((it) => ({
    name: String(it.name ?? '項目'),
    qty: Math.max(1, Math.floor(Number(it.qty) || 1)),
    unitPrice: Math.max(0, Math.floor(Number(it.unitPrice) || 0)),
  }));
  return draft;
}
