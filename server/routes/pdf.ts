import { Router } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const pdfRouter = Router();

/**
 * 見積項目。フロント(src/types)の QuoteItem と対応。
 */
interface QuoteItem {
  name: string;
  qty: number;
  unitPrice: number;
}

interface QuotePayload {
  companyName: string;
  contactName: string;
  quoteNumber: string;
  items: QuoteItem[];
  notes?: string;
}

// ── 単位・寸法 ────────────────────────────────────────────────
// 元の jsPDF 実装は mm 座標系で設計されていたため、pt(=PDFの標準単位)へ
// 変換するヘルパーを用意し、レイアウトの数値をそのまま流用する。
const MM = 2.834645669; // 1mm = 2.83465pt
const mm = (v: number) => v * MM;
const PAGE_W = mm(210); // A4
const MARGIN = mm(20);

// ── フォント解決 ─────────────────────────────────────────────
// pdfkit の内蔵フォント(Helvetica 等)は日本語グリフを持たないため、
// 日本語対応 TTF/OTF を必ず埋め込む。バンドルした Noto Sans JP を第一候補に、
// 環境変数・OS標準フォントへフォールバックする。
const FONTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../assets/fonts');

const REGULAR_CANDIDATES = [
  process.env.PDF_FONT_PATH,
  path.join(FONTS_DIR, 'NotoSansJP-Regular.otf'),
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', // macOS
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', // Debian/Ubuntu
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
].filter(Boolean) as string[];

const BOLD_CANDIDATES = [
  process.env.PDF_FONT_BOLD_PATH,
  path.join(FONTS_DIR, 'NotoSansJP-Bold.otf'),
].filter(Boolean) as string[];

function firstExisting(candidates: string[]): string | null {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

const REGULAR_FONT = firstExisting(REGULAR_CANDIDATES);
const BOLD_FONT = firstExisting(BOLD_CANDIDATES) ?? REGULAR_FONT;

if (!REGULAR_FONT) {
  console.warn(
    '[pdf] 日本語フォントが見つかりません。server/assets/fonts に NotoSansJP を配置するか PDF_FONT_PATH を設定してください。',
  );
}

// ── 描画ヘルパー ─────────────────────────────────────────────
type RGB = [number, number, number];

/** 指定した右端 rightX に右揃えでテキストを配置(フロー非依存)。 */
function textRight(doc: PDFKit.PDFDocument, str: string, rightX: number, y: number) {
  const w = doc.widthOfString(str);
  doc.text(str, rightX - w, y, { lineBreak: false });
}

/** 指定した中心 centerX に中央揃えでテキストを配置。 */
function textCenter(doc: PDFKit.PDFDocument, str: string, centerX: number, y: number) {
  const w = doc.widthOfString(str);
  doc.text(str, centerX - w / 2, y, { lineBreak: false });
}

/** 左揃え(絶対座標)。改行・折返しは無効にしてカーソルを動かさない。 */
function textLeft(doc: PDFKit.PDFDocument, str: string, x: number, y: number) {
  doc.text(str, x, y, { lineBreak: false });
}

const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;

/**
 * 見積書PDFを pdfkit で描画し、指定ストリームへ書き出す。
 * レイアウトは従来のクライアント側 jsPDF 実装(src/lib/pdf.ts)を踏襲。
 */
function renderQuotePdf(doc: PDFKit.PDFDocument, data: QuotePayload) {
  const { companyName, contactName, quoteNumber, items, notes } = data;

  const REG = 'JP';
  const BOLD = 'JP-Bold';

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const setFill = (c: RGB) => doc.fillColor(c);

  // ── ヘッダー背景 ──
  doc.rect(0, 0, PAGE_W, mm(40)).fill([10, 18, 35] as RGB);

  doc.font(BOLD).fontSize(22);
  setFill([255, 255, 255]);
  textLeft(doc, 'QUOTATION', MARGIN, mm(11));

  doc.font(REG).fontSize(8);
  setFill([150, 200, 255]);
  textLeft(doc, 'AI Solution Proposal', MARGIN, mm(21));

  doc
    .moveTo(MARGIN, mm(30))
    .lineTo(PAGE_W - MARGIN, mm(30))
    .lineWidth(mm(0.8))
    .strokeColor([0, 174, 239] as RGB)
    .stroke();

  setFill([200, 220, 255]);
  doc.fontSize(8);
  textRight(doc, `見積番号: ${quoteNumber}`, PAGE_W - MARGIN, mm(15));
  textRight(doc, `発行日: ${today}`, PAGE_W - MARGIN, mm(21));

  // ── お見積先 ──
  doc.font(BOLD).fontSize(9);
  setFill([30, 30, 30]);
  textLeft(doc, 'お見積先', MARGIN, mm(50));

  doc.font(REG).fontSize(12);
  setFill([10, 10, 10]);
  textLeft(doc, `${companyName} 御中`, MARGIN, mm(57));

  doc.fontSize(9);
  setFill([80, 80, 80]);
  textLeft(doc, `担当者: ${contactName} 様`, MARGIN, mm(65));

  // ── 提供会社 ──
  doc.font(BOLD).fontSize(9);
  setFill([30, 30, 30]);
  textLeft(doc, '提供会社', mm(130), mm(50));

  doc.font(REG).fontSize(9);
  setFill([80, 80, 80]);
  textLeft(doc, '株式会社 AI ソリューションズ', mm(130), mm(57));
  textLeft(doc, '〒100-0001 東京都千代田区...', mm(130), mm(63));
  textLeft(doc, 'TEL: 03-XXXX-XXXX', mm(130), mm(69));

  doc
    .moveTo(MARGIN, mm(76))
    .lineTo(PAGE_W - MARGIN, mm(76))
    .lineWidth(mm(0.3))
    .strokeColor([220, 230, 240] as RGB)
    .stroke();

  // ── 明細テーブル: ヘッダー ──
  const tableTop = mm(82);
  doc.rect(MARGIN, tableTop, PAGE_W - MARGIN * 2, mm(8)).fill([15, 25, 50] as RGB);

  doc.font(BOLD).fontSize(8);
  setFill([255, 255, 255]);
  const rowTextY = tableTop + mm(2.5);
  textLeft(doc, '項目', MARGIN + mm(3), rowTextY);
  textCenter(doc, '数量', mm(130), rowTextY);
  textRight(doc, '単価', mm(155), rowTextY);
  textRight(doc, '金額', PAGE_W - MARGIN - mm(3), rowTextY);

  // ── 明細テーブル: 行(ストライプ) ──
  let y = tableTop + mm(8);
  const rowH = mm(9);
  items.forEach((item, idx) => {
    const shade: RGB = idx % 2 === 0 ? [248, 251, 255] : [255, 255, 255];
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, rowH).fill(shade);

    doc.font(REG).fontSize(8);
    setFill([30, 30, 30]);
    const ty = y + mm(3);
    textLeft(doc, item.name, MARGIN + mm(3), ty);
    textCenter(doc, String(item.qty), mm(130), ty);
    textRight(doc, yen(item.unitPrice), mm(155), ty);
    textRight(doc, yen(item.qty * item.unitPrice), PAGE_W - MARGIN - mm(3), ty);

    y += rowH;
  });

  // ── 合計 ──
  y += mm(4);
  doc
    .moveTo(mm(130), y)
    .lineTo(PAGE_W - MARGIN, y)
    .lineWidth(mm(0.3))
    .strokeColor([200, 210, 225] as RGB)
    .stroke();
  y += mm(5);

  const labelRight = mm(150);
  const valueRight = PAGE_W - MARGIN - mm(3);

  doc.font(REG).fontSize(8);
  setFill([80, 80, 80]);
  textRight(doc, '小計', labelRight, y);
  textRight(doc, yen(subtotal), valueRight, y);
  y += mm(6);
  textRight(doc, '消費税（10%）', labelRight, y);
  textRight(doc, yen(tax), valueRight, y);
  // pdfkit の text 座標は上端基準のため、下線が文字に被らないよう文字高ぶん送る
  y += mm(5);

  doc
    .moveTo(mm(130), y)
    .lineTo(PAGE_W - MARGIN, y)
    .lineWidth(mm(0.5))
    .strokeColor([0, 174, 239] as RGB)
    .stroke();
  y += mm(6);

  doc.font(BOLD).fontSize(10);
  setFill([10, 18, 35]);
  textRight(doc, '合計（税込）', labelRight, y);
  setFill([0, 120, 200]);
  textRight(doc, yen(total), valueRight, y);

  // ── 備考 ──
  y += mm(14);
  const noteH = mm(24);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, noteH).fill([245, 248, 255] as RGB);
  doc
    .rect(MARGIN, y, PAGE_W - MARGIN * 2, noteH)
    .lineWidth(mm(0.3))
    .strokeColor([200, 215, 235] as RGB)
    .stroke();

  doc.font(BOLD).fontSize(8);
  setFill([30, 30, 80]);
  textLeft(doc, '備考', MARGIN + mm(3), y + mm(3));

  doc.font(REG).fontSize(7.5);
  setFill([60, 60, 80]);
  const noteLine1 = notes?.trim()
    ? `・${notes.trim()}`
    : '・本見積書の有効期限は発行日より30日間です。';
  textLeft(doc, noteLine1, MARGIN + mm(3), y + mm(9));
  textLeft(
    doc,
    '・上記金額は概算です。詳細なご要件確認後、正式見積書を発行いたします。',
    MARGIN + mm(3),
    y + mm(15),
  );

  // ── フッター ──
  doc.rect(0, mm(282), PAGE_W, mm(15)).fill([10, 18, 35] as RGB);
  doc.font(REG).fontSize(7);
  setFill([120, 160, 210]);
  textCenter(doc, 'AI Solutions Inc. — Confidential Document', PAGE_W / 2, mm(288));
}

// ── バリデーション ───────────────────────────────────────────
function sanitize(body: unknown): QuotePayload | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const rawItems = Array.isArray(b.items) ? b.items : [];
  const items: QuoteItem[] = rawItems
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? '').slice(0, 120),
        qty: Math.max(0, Math.floor(Number(o.qty) || 0)),
        unitPrice: Math.max(0, Number(o.unitPrice) || 0),
      };
    })
    .filter((it) => it.name.length > 0);

  if (items.length === 0) {
    return { error: 'items が空です（name/qty/unitPrice を持つ配列が必要）' };
  }

  return {
    companyName: String(b.companyName ?? '').trim() || '御中',
    contactName: String(b.contactName ?? '').trim() || 'ご担当者',
    quoteNumber:
      String(b.quoteNumber ?? '').trim() ||
      `Q-${new Date().getFullYear()}-0000`,
    items,
    notes: b.notes != null ? String(b.notes) : undefined,
  };
}

/**
 * POST /api/pdf
 * 見積データ(JSON)を受け取り、pdfkit で見積書PDFを動的生成して返す。
 *
 * body: { companyName, contactName, quoteNumber, items:[{name,qty,unitPrice}], notes? }
 * res : application/pdf (バイナリ本体)
 */
pdfRouter.post('/', (req, res) => {
  const result = sanitize(req.body);
  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  if (!REGULAR_FONT) {
    return res.status(500).json({
      error:
        '日本語フォントが未設定です。server/assets/fonts に NotoSansJP を配置するか PDF_FONT_PATH を設定してください。',
    });
  }

  const filename = `見積書_${result.quoteNumber}_${result.companyName}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="quote.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );

  const doc = new PDFDocument({ size: 'A4', margin: 0 });

  // ストリーム途中でのエラーはヘッダー送信後だと救えないため、
  // 破棄してコネクションを閉じる。
  doc.on('error', (e) => {
    console.error('[pdf] 生成エラー:', e);
    if (!res.headersSent) res.status(500).json({ error: 'PDF生成に失敗しました' });
    else res.end();
  });

  doc.pipe(res);

  try {
    doc.registerFont('JP', REGULAR_FONT);
    doc.registerFont('JP-Bold', BOLD_FONT as string);
    doc.font('JP');
    renderQuotePdf(doc, result);
    doc.end();
  } catch (e) {
    console.error('[pdf] 描画エラー:', e);
    if (!res.headersSent) res.status(500).json({ error: 'PDF生成に失敗しました' });
    else res.end();
  }
});
