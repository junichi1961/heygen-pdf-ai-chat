import { Router } from 'express';
import { generateQuote, type ChatMsg } from '../lib/anthropic';
import { resolveModel, isMockMode } from '../env';
import { buildMockQuote } from '../lib/mock';

export const quoteRouter = Router();

/**
 * 会話履歴から見積ドラフト(JSON)を生成して返す。
 * body: { messages: {role,content}[], model? }
 * 返り値: { companyName?, contactName?, items:[{name,qty,unitPrice}], notes? }
 *
 * ANTHROPIC_API_KEY が無い場合はローカルダミーモードで生成する。
 */
quoteRouter.post('/generate', async (req, res) => {
  const messages: ChatMsg[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (messages.length === 0) {
    return res.status(400).json({ error: 'messages が空です' });
  }

  // ── ローカルダミーモード ──
  if (isMockMode()) {
    return res.json(buildMockQuote(messages));
  }

  // ── 実 Claude モード ──
  try {
    const draft = await generateQuote({ model: resolveModel(req.body?.model), messages });
    res.json(draft);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
