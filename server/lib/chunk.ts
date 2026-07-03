/**
 * 長文を埋め込み用のチャンクに分割する。
 * まず段落（空行）で区切り、長すぎる段落は文字数でスライスしながら
 * チャンク間に少しオーバーラップを持たせて文脈の断絶を防ぐ。
 */
export function chunkText(
  text: string,
  { maxChars = 800, overlap = 120 }: { maxChars?: number; overlap?: number } = {},
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = '';
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      flush();
      for (let i = 0; i < para.length; i += maxChars - overlap) {
        chunks.push(para.slice(i, i + maxChars).trim());
      }
      continue;
    }
    if ((buffer + '\n\n' + para).length > maxChars) {
      flush();
    }
    buffer = buffer ? `${buffer}\n\n${para}` : para;
  }
  flush();

  return chunks;
}
