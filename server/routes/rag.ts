import { Router } from 'express';
import { db, type ChunkRow } from '../db';
import { chunkText } from '../lib/chunk';
import { embed, cosineSim } from '../lib/embeddings';

export const ragRouter = Router();

/**
 * ドキュメントを取り込み → チャンク分割 → 埋め込み → SQLite 保存。
 * NotebookLM の共有ソース等から取り出したテキストをここに流し込む想定。
 * body: { title, source?, text }
 */
ragRouter.post('/ingest', async (req, res) => {
  const { title, source, text } = req.body ?? {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text は必須です' });
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return res.status(400).json({ error: '取り込めるテキストがありません' });
  }

  const docStmt = db.prepare('INSERT INTO documents (title, source) VALUES (?, ?)');
  const docInfo = docStmt.run(title ?? '無題', source ?? null);
  const documentId = Number(docInfo.lastInsertRowid);

  const insertChunk = db.prepare(
    'INSERT INTO chunks (document_id, seq, content, embedding) VALUES (?, ?, ?, ?)',
  );

  // 埋め込みは非同期なので先に計算 → トランザクションでまとめて保存
  const embeddings = await Promise.all(chunks.map((c) => embed(c)));
  db.exec('BEGIN');
  try {
    chunks.forEach((content, i) => {
      insertChunk.run(documentId, i, content, JSON.stringify(embeddings[i]));
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  res.json({ documentId, title: title ?? '無題', chunks: chunks.length });
});

/**
 * 類似チャンク検索。query を埋め込み、全チャンクとコサイン類似度を取って上位を返す。
 * デモ規模のため全件走査。件数が増える場合は近似最近傍(ANN)に差し替える。
 * body: { query, topK? }
 */
ragRouter.post('/search', async (req, res) => {
  const { query, topK } = req.body ?? {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query は必須です' });
  }

  const qVec = await embed(query);
  const rows = db
    .prepare(
      `SELECT c.id, c.content, c.embedding, d.title
       FROM chunks c JOIN documents d ON d.id = c.document_id`,
    )
    .all() as (Pick<ChunkRow, 'id' | 'content' | 'embedding'> & { title: string })[];

  const scored = rows
    .map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      score: cosineSim(qVec, JSON.parse(r.embedding) as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(20, Number(topK) || 4)));

  res.json({ results: scored });
});

/** 取り込み状況（設定画面の接続状況表示用） */
ragRouter.get('/status', (_req, res) => {
  const docs = (db.prepare('SELECT COUNT(*) n FROM documents').get() as { n: number }).n;
  const chunks = (db.prepare('SELECT COUNT(*) n FROM chunks').get() as { n: number }).n;
  res.json({ documents: docs, chunks });
});

/** 全消去（デモ用） */
ragRouter.delete('/all', (_req, res) => {
  db.exec('DELETE FROM chunks; DELETE FROM documents;');
  res.json({ ok: true });
});
