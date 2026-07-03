import express from 'express';
import cors from 'cors';
import { config, isMockMode } from './env';
import { db } from './db';
import { chatRouter } from './routes/chat';
import { ragRouter } from './routes/rag';
import { quoteRouter } from './routes/quote';
import { heygenRouter } from './routes/heygen';
import { pdfRouter } from './routes/pdf';

const app = express();

app.use(cors());
app.use(express.json({ limit: '4mb' }));

// 接続状況（設定画面のバッジ表示に使用）。APIキーの有無だけを返し、値は返さない。
app.get('/api/status', (_req, res) => {
  const docs = (db.prepare('SELECT COUNT(*) n FROM documents').get() as { n: number }).n;
  const chunks = (db.prepare('SELECT COUNT(*) n FROM chunks').get() as { n: number }).n;
  res.json({
    anthropic: Boolean(config.anthropicApiKey),
    heygen: Boolean(config.heygenApiKey),
    mock: isMockMode(),
    embeddingProvider: config.embeddingProvider,
    rag: { documents: docs, chunks },
    defaultModel: config.defaultModel,
  });
});

app.use('/api/chat', chatRouter);
app.use('/api/rag', ragRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/heygen', heygenRouter);
app.use('/api/pdf', pdfRouter);

app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  console.log(`[server] mode:          ${isMockMode() ? 'MOCK (ダミー応答)' : 'LIVE (Claude API)'}`);
  console.log(`[server] anthropic key: ${config.anthropicApiKey ? 'set' : 'MISSING'}`);
  console.log(`[server] heygen key:    ${config.heygenApiKey ? 'set' : 'MISSING'}`);
  console.log(`[server] embeddings:    ${config.embeddingProvider}`);
});
