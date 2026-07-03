# heygen-pdf-ai-chat (NexusAI)

AIエージェント × HeyGen Live Avatar × 動的見積書生成のデモ。
フロント（Vite + React + TS）と、ローカル完結のバックエンド（Node/Express + SQLite）で構成。

## アーキテクチャ

```
[React/Vite :5173]  ──/api (Viteプロキシ)──▶  [Express :8787]  ──▶ Claude API（チャット/見積）
   APIキーを持たない                              server/.env にキーを秘匿
                                                ├─▶ node:sqlite（RAG知識・埋め込み）
                                                └─▶ HeyGen トークン発行（Live Avatar）
```

- **APIキーはブラウザに出さない** — すべて `server/.env` に置き、フロントは `/api` 経由でのみ利用。
- **RAG** — テキストを取り込み→チャンク分割→埋め込み→SQLite保存。検索は Node 内でコサイン類似度計算（追加サービス/拡張不要）。埋め込みは `local`（ゼロ依存・オフライン）既定、`openai` も選択可。
- **DB** — Node 標準の `node:sqlite`（ネイティブコンパイル不要）。データは `server/data/app.db`（Git管理外）。

## セットアップ

```bash
npm install
cp .env.example .env      # ANTHROPIC_API_KEY / HEYGEN_API_KEY 等を記入
npm run dev:all           # フロント(:5173) と API(:8787) を同時起動
```

個別に起動する場合:

```bash
npm run dev        # フロントのみ
npm run server     # APIのみ
```

## 主要ファイル

| 領域 | パス |
|------|------|
| APIクライアント | `src/lib/api.ts`（SSEチャット・RAG・見積・HeyGenトークン） |
| 設定/状態共有 | `src/context/SettingsContext.tsx` |
| HeyGen連携 | `src/hooks/useHeyGenAvatar.ts` / `src/components/AvatarPanel.tsx` |
| 見積PDF | `src/lib/pdf.ts` / `src/components/PdfGenerator.tsx` |
| バックエンド | `server/index.ts` / `server/routes/*` / `server/lib/*` / `server/db.ts` |

## エンドポイント

| メソッド | パス | 用途 |
|---------|------|------|
| GET  | `/api/status` | 接続状況（キー有無・RAG件数） |
| POST | `/api/chat` | チャット応答（SSEストリーミング、RAG任意） |
| POST | `/api/quote/generate` | 会話から見積JSONを構造化生成 |
| POST | `/api/rag/ingest` | 知識テキストの取り込み |
| POST | `/api/rag/search` | 類似チャンク検索 |
| POST | `/api/heygen/token` | HeyGen Streaming セッショントークン発行 |

## 補足

- Claude モデル既定は `claude-opus-4-8`（設定画面で Sonnet 5 / Haiku 4.5 に変更可）。
- HeyGen の `@heygen/streaming-avatar` は接続時に動的 import。npm 公開物が不完全な場合は接続時にエラー表示となる（有効な SDK と `HEYGEN_AVATAR_ID` が必要）。
- NotebookLM は公式API未公開のため、共有ソースの本文を設定画面から貼り付けて自前RAG化する運用。
