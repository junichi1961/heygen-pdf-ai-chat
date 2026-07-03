import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './env';

// DB ファイルの置き場所を用意（server/data/ は .gitignore 済み）
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

// Node 標準の SQLite（node:sqlite）。ネイティブコンパイル不要でローカル完結。
export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');

// スキーマ。SQLite にはベクトル型が無いため、embedding は JSON 文字列で保存し、
// 検索時に Node 側でコサイン類似度を計算する（ローカル完結・追加拡張不要）。
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    source     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,
    content     TEXT NOT NULL,
    embedding   TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
`);

export interface DocumentRow {
  id: number;
  title: string;
  source: string | null;
  created_at: string;
}

export interface ChunkRow {
  id: number;
  document_id: number;
  seq: number;
  content: string;
  embedding: string;
  created_at: string;
}
