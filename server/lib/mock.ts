import type { ChatMsg, QuoteDraft, QuoteItem } from './anthropic';

/**
 * ローカルダミーモード（モック）。
 * ANTHROPIC_API_KEY が無い（または MOCK_MODE=1）ときに、Claude を呼ばずに
 * それっぽい応答・見積JSONを生成する。デモ・オフライン検証用。
 */

const QUOTE_INTENT = /(見積|見積もり|お見積|クオート|quote|提案書|費用|料金|価格|いくら|コスト)/i;

/** 直近のユーザー発言が「見積を作って」系かどうか */
export function isQuoteIntent(messages: ChatMsg[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  return lastUser ? QUOTE_INTENT.test(lastUser.content) : false;
}

/** Claude が考えたような体裁のダミー応答テキストを生成 */
export function buildMockReply(messages: ChatMsg[], hasRag: boolean): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const snippet = (lastUser?.content ?? '').trim().slice(0, 40);
  const ragLine = hasRag
    ? '（社内ナレッジの関連ドキュメントも参照しました。）\n\n'
    : '';

  if (isQuoteIntent(messages)) {
    return (
      ragLine +
      '承知いたしました。これまでのご要件を整理し、概算のお見積もりを作成します。\n\n' +
      '**ご提案の構成**\n' +
      '1. AIエージェント基盤の構築\n' +
      '2. HeyGen Live Avatar 連携\n' +
      '3. RAGナレッジ検索の実装\n' +
      '4. 運用・保守サポート\n\n' +
      '上記をもとに見積書ドラフトを自動生成しました。' +
      '見積書ウィンドウが開きますので、金額や項目をその場で調整のうえPDF出力いただけます。'
    );
  }

  return (
    ragLine +
    `ご相談ありがとうございます。「${snippet}${snippet.length >= 40 ? '…' : ''}」について承知しました。\n\n` +
    'より具体的にご提案するため、差し支えなければ以下を教えてください。\n' +
    '- 想定ユーザー数 / 利用シーン\n' +
    '- 必要な機能の優先度\n' +
    '- ご希望の納期・予算感\n\n' +
    '要件が固まりましたら「見積もりを作って」とお送りいただければ、その場で見積書を生成します。'
  );
}

/** 会話中のキーワードから見積項目を組み立てるダミー見積 */
export function buildMockQuote(messages: ChatMsg[]): QuoteDraft {
  const text = messages.map((m) => m.content).join('\n');

  const items: QuoteItem[] = [
    { name: 'AIエージェント基盤構築', qty: 1, unitPrice: 1500000 },
  ];

  const add = (cond: RegExp, item: QuoteItem) => {
    if (cond.test(text) && !items.some((i) => i.name === item.name)) items.push(item);
  };

  add(/(アバター|heygen|動画|avatar|読み上げ)/i, {
    name: 'HeyGen Live Avatar 連携',
    qty: 1,
    unitPrice: 600000,
  });
  add(/(rag|検索|ナレッジ|notebook|知識|ドキュメント)/i, {
    name: 'RAG・ナレッジ検索基盤',
    qty: 1,
    unitPrice: 800000,
  });
  add(/(api|連携|統合|システム|既存)/i, {
    name: '既存システムAPI連携',
    qty: 1,
    unitPrice: 800000,
  });
  add(/(見積|提案|pdf|帳票|書類|ドキュメント自動)/i, {
    name: '帳票（見積書/提案書）自動生成',
    qty: 1,
    unitPrice: 400000,
  });

  // 定番項目
  items.push({ name: '運用保守サポート（月額）', qty: 12, unitPrice: 150000 });
  items.push({ name: '教育・トレーニング', qty: 1, unitPrice: 200000 });

  return {
    items,
    notes: 'ローカルダミーモードで生成した概算見積です。正式見積は要件確定後に発行します。',
  };
}

/** テキストを少しずつ onDelta に流し、ストリーミング応答を演出する */
export async function streamMockText(
  text: string,
  onDelta: (chunk: string) => void,
): Promise<void> {
  let i = 0;
  while (i < text.length) {
    const size = Math.floor(Math.random() * 3) + 2; // 2〜4文字ずつ
    onDelta(text.slice(i, i + size));
    i += size;
    await new Promise((r) => setTimeout(r, 15));
  }
}
