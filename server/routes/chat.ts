import { Router } from 'express';
import { streamChat, type ChatMsg } from '../lib/anthropic';
import { resolveModel, isMockMode } from '../env';
import { db } from '../db';
import { embed, cosineSim } from '../lib/embeddings';
import { buildMockReply, buildMockQuote, isQuoteIntent, streamMockText } from '../lib/mock';

export const chatRouter = Router();

interface RetrievedChunk {
  title: string;
  content: string;
  score: number;
}

async function retrieve(query: string, topK = 4): Promise<RetrievedChunk[]> {
  const qVec = await embed(query);
  const rows = db
    .prepare(
      `SELECT c.content, c.embedding, d.title
       FROM chunks c JOIN documents d ON d.id = c.document_id`,
    )
    .all() as { content: string; embedding: string; title: string }[];

  return rows
    .map((r) => ({
      title: r.title,
      content: r.content,
      score: cosineSim(qVec, JSON.parse(r.embedding) as number[]),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

const BASE_SYSTEM =
  'あなたは日本語で応答する法人向けAIソリューションの提案アシスタントです。' +
  '要件をヒアリングし、提案内容や見積の相談に的確に答えます。簡潔で分かりやすく、' +
  '必要なら箇条書きを使ってください。';

/**
 * SSE でチャット応答をストリーミング。
 * body: { messages: {role,content}[], model?, ragEnabled?: boolean }
 * 送出イベント: {type:'sources'|'quote'|'delta'|'done'|'error', ...}
 *
 * ANTHROPIC_API_KEY が無い場合は自動でローカルダミーモードに切り替わり、
 * Claude を呼ばずに応答＋見積JSONを生成する。
 */
chatRouter.post('/', async (req, res) => {
  const messages: ChatMsg[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const ragEnabled: boolean = Boolean(req.body?.ragEnabled);
  const model = resolveModel(req.body?.model);
  const mock = isMockMode();

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (messages.length === 0) {
    send({ type: 'error', message: 'messages が空です' });
    return res.end();
  }

  try {
    // RAG 検索は両モード共通（ローカル埋め込みでオフライン動作）
    let ragHits: RetrievedChunk[] = [];
    if (ragEnabled) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser) {
        ragHits = await retrieve(lastUser.content);
        if (ragHits.length > 0) {
          send({
            type: 'sources',
            sources: ragHits.map((h) => ({
              title: h.title,
              score: Number(h.score.toFixed(3)),
              excerpt: h.content.slice(0, 120),
            })),
          });
        }
      }
    }

    // ── ローカルダミーモード ──
    if (mock) {
      // 「見積もりを作って」系なら、見積JSONを先に流してフロントで自動表示
      if (isQuoteIntent(messages)) {
        send({ type: 'quote', draft: buildMockQuote(messages) });
      }
      const reply = buildMockReply(messages, ragHits.length > 0);
      await streamMockText(reply, (delta) => send({ type: 'delta', text: delta }));
      send({ type: 'done' });
      return res.end();
    }

    // ── 実 Claude モード ──
    let system = BASE_SYSTEM;
    if (ragHits.length > 0) {
      system +=
        '\n\n# 参考知識（社内ナレッジ検索の結果）\n' +
        '以下は関連しそうな社内ドキュメントの抜粋です。回答の根拠に使い、' +
        '無関係なら無視してください。\n\n' +
        ragHits.map((h, i) => `[${i + 1}] (${h.title})\n${h.content}`).join('\n\n');
    }

    await streamChat({
      model,
      system,
      messages,
      onText: (delta) => send({ type: 'delta', text: delta }),
    });

    send({ type: 'done' });
  } catch (e) {
    send({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
  res.end();
});
