import { useState } from 'react';
import { FileText, Download, Building2, Hash, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import type { Message } from './ChatInterface';

interface PdfGeneratorProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
}

interface QuoteItem {
  name: string;
  qty: number;
  unitPrice: number;
}

const DEFAULT_ITEMS: QuoteItem[] = [
  { name: 'AIエージェント基盤構築', qty: 1, unitPrice: 1500000 },
  { name: 'API連携・システム統合', qty: 1, unitPrice: 800000 },
  { name: '運用保守サポート（月額）', qty: 12, unitPrice: 150000 },
  { name: '教育・トレーニング', qty: 1, unitPrice: 200000 },
];

export default function PdfGenerator({ isOpen, onClose }: PdfGeneratorProps) {
  const [companyName, setCompanyName] = useState('株式会社サンプル');
  const [contactName, setContactName] = useState('山田 太郎');
  const [quoteNumber] = useState(`Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const items: QuoteItem[] = DEFAULT_ITEMS;
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const handleGenerate = async () => {
    setGenerating(true);

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const pageW = 210;
    const margin = 20;

    // Header background
    doc.setFillColor(10, 18, 35);
    doc.rect(0, 0, pageW, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', margin, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 200, 255);
    doc.text('AI Solution Proposal', margin, 25);

    // Accent line
    doc.setDrawColor(0, 174, 239);
    doc.setLineWidth(0.8);
    doc.line(margin, 30, pageW - margin, 30);

    // Quote meta
    doc.setTextColor(200, 220, 255);
    doc.setFontSize(8);
    doc.text(`見積番号: ${quoteNumber}`, pageW - margin, 18, { align: 'right' });
    doc.text(`発行日: ${today}`, pageW - margin, 24, { align: 'right' });

    // Bill to
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('お見積先', margin, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(10, 10, 10);
    doc.text(`${companyName} 御中`, margin, 60);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`担当者: ${contactName} 様`, margin, 67);

    // Provider
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text('提供会社', 130, 52);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text('株式会社 AI ソリューションズ', 130, 59);
    doc.text('〒100-0001 東京都千代田区...', 130, 65);
    doc.text('TEL: 03-XXXX-XXXX', 130, 71);

    // Separator
    doc.setDrawColor(220, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 76, pageW - margin, 76);

    // Table header
    const tableTop = 82;
    doc.setFillColor(15, 25, 50);
    doc.rect(margin, tableTop, pageW - margin * 2, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('項目', margin + 3, tableTop + 5.5);
    doc.text('数量', 130, tableTop + 5.5, { align: 'center' });
    doc.text('単価', 155, tableTop + 5.5, { align: 'right' });
    doc.text('金額', pageW - margin - 3, tableTop + 5.5, { align: 'right' });

    // Table rows
    let y = tableTop + 8;
    items.forEach((item, idx) => {
      const rowH = 9;
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 251 : 255, 255);
      doc.rect(margin, y, pageW - margin * 2, rowH, 'F');

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(item.name, margin + 3, y + 6);
      doc.text(String(item.qty), 130, y + 6, { align: 'center' });
      doc.text(`¥${item.unitPrice.toLocaleString()}`, 155, y + 6, { align: 'right' });
      doc.text(`¥${(item.qty * item.unitPrice).toLocaleString()}`, pageW - margin - 3, y + 6, { align: 'right' });

      y += rowH;
    });

    // Totals
    y += 4;
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.3);
    doc.line(130, y, pageW - margin, y);
    y += 5;

    const labelX = 150;
    const valueX = pageW - margin - 3;

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('小計', labelX, y, { align: 'right' });
    doc.text(`¥${subtotal.toLocaleString()}`, valueX, y, { align: 'right' });
    y += 6;
    doc.text('消費税（10%）', labelX, y, { align: 'right' });
    doc.text(`¥${tax.toLocaleString()}`, valueX, y, { align: 'right' });
    y += 2;

    doc.setDrawColor(0, 174, 239);
    doc.setLineWidth(0.5);
    doc.line(130, y, pageW - margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 18, 35);
    doc.text('合計（税込）', labelX, y, { align: 'right' });
    doc.setTextColor(0, 120, 200);
    doc.text(`¥${total.toLocaleString()}`, valueX, y, { align: 'right' });

    // Notes
    y += 14;
    doc.setFillColor(245, 248, 255);
    doc.rect(margin, y, pageW - margin * 2, 24, 'F');
    doc.setDrawColor(200, 215, 235);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, pageW - margin * 2, 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 80);
    doc.text('備考', margin + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(7.5);
    doc.text('・本見積書の有効期限は発行日より30日間です。', margin + 3, y + 12);
    doc.text('・上記金額は概算です。詳細なご要件確認後、正式見積書を発行いたします。', margin + 3, y + 18);

    // Footer
    doc.setFillColor(10, 18, 35);
    doc.rect(0, 282, pageW, 15, 'F');
    doc.setTextColor(120, 160, 210);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('AI Solutions Inc. — Confidential Document', pageW / 2, 291, { align: 'center' });

    doc.save(`見積書_${quoteNumber}_${companyName}.pdf`);

    setGenerating(false);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[hsl(222_20%_10%)] border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-[hsl(222_20%_12%)] to-[hsl(222_25%_9%)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <FileText size={15} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">見積書 / 提案書 生成</h2>
              <p className="text-xs text-muted-foreground mt-0.5">PDFファイルを動的に生成・ダウンロード</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 size={12} />
              お見積先情報
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">会社名</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-8 text-sm bg-secondary/50 border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">担当者名</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="h-8 text-sm bg-secondary/50 border-border/60"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Hash size={11} />
                見積番号
              </Label>
              <Input
                value={quoteNumber}
                readOnly
                className="h-8 text-sm bg-secondary/50 border-border/60"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              見積項目
            </h3>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-secondary/60 text-[10px] font-medium text-muted-foreground">
                <span className="col-span-6">項目名</span>
                <span className="col-span-2 text-center">数量</span>
                <span className="col-span-4 text-right">単価</span>
              </div>
              {items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-border/30 text-xs"
                >
                  <span className="col-span-6 text-foreground/80 truncate">{item.name}</span>
                  <span className="col-span-2 text-center text-muted-foreground">{item.qty}</span>
                  <span className="col-span-4 text-right text-muted-foreground">
                    ¥{item.unitPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>小計</span>
              <span>¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>消費税（10%）</span>
              <span>¥{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-primary/20 pt-2">
              <span className="text-foreground">合計（税込）</span>
              <span className="text-primary">¥{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            キャンセル
          </button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className={cn(
              'h-9 px-5 text-sm font-medium rounded-xl transition-all',
              generated
                ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground glow-primary-sm hover:opacity-90'
            )}
          >
            {generated ? (
              <><CheckCircle size={14} className="mr-2" />生成完了!</>
            ) : generating ? (
              <>生成中...</>
            ) : (
              <><Download size={14} className="mr-2" />PDFをダウンロード</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
