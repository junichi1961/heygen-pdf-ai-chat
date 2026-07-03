import type { QuoteDraft, QuoteItem, RagSource, StatusInfo, ChatRole } from '../types';

/**
 * ローカル Express バックエンド（/api）を呼ぶ薄いクライアント。
 * すべて Vite プロキシ経由でサーバーに届き、APIキーはブラウザに出ない。
 */

export interface ChatWireMessage {
  role: ChatRole;
  content: string;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function getStatus(): Promise<StatusInfo> {
  return fetch('/api/status').then((r) => jsonOrThrow<StatusInfo>(r));
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onSources?: (sources: RagSource[]) => void;
  /** サーバーが会話から自動生成した見積ドラフト（モック時など） */
  onQuote?: (draft: QuoteDraft) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * チャットを SSE でストリーミング受信。サーバーからの
 * {type:'delta'|'sources'|'done'|'error'} イベントをハンドラに振り分ける。
 */
export async function streamChat(
  body: { messages: ChatWireMessage[]; model?: string; ragEnabled?: boolean },
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError?.(`サーバーエラー (HTTP ${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;

      let evt: {
        type: string;
        text?: string;
        sources?: RagSource[];
        draft?: QuoteDraft;
        message?: string;
      };
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }

      switch (evt.type) {
        case 'delta':
          if (evt.text) handlers.onDelta(evt.text);
          break;
        case 'sources':
          handlers.onSources?.(evt.sources ?? []);
          break;
        case 'quote':
          if (evt.draft) handlers.onQuote?.(evt.draft);
          break;
        case 'done':
          handlers.onDone?.();
          break;
        case 'error':
          handlers.onError?.(evt.message ?? '不明なエラー');
          break;
      }
    }
  }
}

export function generateQuote(
  messages: ChatWireMessage[],
  model?: string,
): Promise<QuoteDraft> {
  return fetch('/api/quote/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model }),
  }).then((r) => jsonOrThrow<QuoteDraft>(r));
}

export interface QuotePdfInput {
  companyName: string;
  contactName: string;
  quoteNumber: string;
  items: QuoteItem[];
  notes?: string;
}

/**
 * バックエンド(/api/pdf)で見積書PDFを生成し、Blobとして受け取って
 * ブラウザにダウンロードさせる。PDFの描画は完全にサーバー側(pdfkit)で行う。
 */
export async function downloadQuotePdf(input: QuotePdfInput): Promise<void> {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    // サーバーはエラー時 JSON({error}) を返す
    let msg = `PDF生成に失敗しました (HTTP ${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `見積書_${input.quoteNumber}_${input.companyName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // click 直後の revoke はダウンロードを中断し得るため、少し遅延させる
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function ragIngest(input: {
  title: string;
  source?: string;
  text: string;
}): Promise<{ documentId: number; title: string; chunks: number }> {
  return fetch('/api/rag/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => jsonOrThrow(r));
}

export function ragSearch(
  query: string,
  topK = 4,
): Promise<{ results: (RagSource & { id: number })[] }> {
  return fetch('/api/rag/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK }),
  }).then((r) => jsonOrThrow(r));
}

export function getHeyGenToken(): Promise<{ token: string; avatarId: string | null }> {
  return fetch('/api/heygen/token', { method: 'POST' }).then((r) => jsonOrThrow(r));
}
