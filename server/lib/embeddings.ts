import { config } from '../env';

/**
 * 埋め込み（ベクトル化）。方式は環境変数 EMBEDDING_PROVIDER で切替。
 *  - 'local'  : ゼロ依存・オフラインで動くハッシュ埋め込み（デモ既定）
 *  - 'openai' : OpenAI の埋め込みAPI（高品質・要APIキー）
 *
 * ローカル方式は語彙のハッシュを固定次元のバケットに写す簡易 bag-of-features。
 * 日本語（空白区切りが無い）にも効くよう、単語トークンに加えて文字bigramも特徴に含める。
 * 品質は本格的な埋め込みモデルに劣るが、RAG のパイプライン全体をローカルだけで
 * 成立させられるのが利点。品質が要るなら 'openai' に切替える。
 */

const LOCAL_DIM = 384;

function localEmbed(text: string): number[] {
  const vec = new Float64Array(LOCAL_DIM);
  const lower = text.toLowerCase();

  const add = (feature: string, weight = 1) => {
    const idx = hash(feature) % LOCAL_DIM;
    vec[idx] += weight;
  };

  // ラテン文字・数字の単語トークン
  const words = lower.match(/[a-z0-9]+/g) ?? [];
  for (const w of words) add(`w:${w}`);

  // CJK など非ラテン連続文字の bigram（日本語対応）
  const cjkRuns = lower.match(/[^\sa-z0-9]+/g) ?? [];
  for (const run of cjkRuns) {
    if (run.length === 1) {
      add(`c:${run}`);
    } else {
      for (let i = 0; i < run.length - 1; i++) add(`c:${run.slice(i, i + 2)}`);
    }
  }

  // L2 正規化（正規化しておけばコサイン類似度は内積で求まる）
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

/** 決定的な 32bit ハッシュ（FNV-1a） */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0);
}

async function openaiEmbed(text: string): Promise<number[]> {
  if (!config.openaiApiKey) {
    throw new Error('EMBEDDING_PROVIDER=openai ですが OPENAI_API_KEY が未設定です');
  }
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

export async function embed(text: string): Promise<number[]> {
  return config.embeddingProvider === 'openai' ? openaiEmbed(text) : localEmbed(text);
}

/** コサイン類似度。次元が違う場合は 0 を返す。 */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
