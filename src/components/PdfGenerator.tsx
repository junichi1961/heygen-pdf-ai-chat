import { useState, useEffect } from 'react';
import { FileText, Download, Building2, Hash, CheckCircle, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import type { Message } from './ChatInterface';
import type { QuoteItem, QuoteDraft } from '../types';
import { generateQuote, downloadQuotePdf } from '../lib/api';
import { useSettings } from '../context/SettingsContext';

interface PdfGeneratorProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  /** 会話から自動生成された見積ドラフト（渡されると項目に自動反映） */
  draft?: QuoteDraft | null;
}

const DEFAULT_ITEMS: QuoteItem[] = [
  { name: 'AIエージェント基盤構築', qty: 1, unitPrice: 1500000 },
  { name: 'API連携・システム統合', qty: 1, unitPrice: 800000 },
  { name: '運用保守サポート（月額）', qty: 12, unitPrice: 150000 },
  { name: '教育・トレーニング', qty: 1, unitPrice: 200000 },
];

export default function PdfGenerator({ messages, isOpen, onClose, draft }: PdfGeneratorProps) {
  const { model } = useSettings();
  const [companyName, setCompanyName] = useState('株式会社サンプル');
  const [contactName, setContactName] = useState('山田 太郎');
  const [quoteNumber] = useState(
    `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  );
  const [items, setItems] = useState<QuoteItem[]>(DEFAULT_ITEMS);
  const [notes, setNotes] = useState('');
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 会話から自動生成された見積ドラフトを項目に反映
  useEffect(() => {
    if (!draft) return;
    if (draft.items?.length) setItems(draft.items);
    if (draft.companyName) setCompanyName(draft.companyName);
    if (draft.contactName) setContactName(draft.contactName);
    if (draft.notes) setNotes(draft.notes);
  }, [draft]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  // 会話履歴から見積項目をAIで自動生成
  const handleAiGenerate = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const wire = messages
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));
      if (wire.length === 0) {
        setError('会話がありません。先にチャットで要件を入力してください。');
        return;
      }
      const draft = await generateQuote(wire, model);
      if (draft.items?.length) setItems(draft.items);
      if (draft.companyName) setCompanyName(draft.companyName);
      if (draft.contactName) setContactName(draft.contactName);
      if (draft.notes) setNotes(draft.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await downloadQuotePdf({ companyName, contactName, quoteNumber, items, notes });
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[hsl(222_20%_10%)] border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-[hsl(222_20%_12%)] to-[hsl(222_25%_9%)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <FileText size={15} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">見積書 / 提案書 生成</h2>
              <p className="text-xs text-muted-foreground mt-0.5">会話内容からAIで動的生成・PDF出力</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* AI generate */}
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-medium transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> 会話から見積を生成中...
              </>
            ) : (
              <>
                <Sparkles size={13} /> 会話内容から見積項目を自動生成
              </>
            )}
          </button>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400/90 flex gap-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

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

          {/* Items (editable) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              見積項目（編集可）
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
                  className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-border/30 text-xs items-center"
                >
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(i, { name: e.target.value })}
                    className="col-span-6 bg-transparent text-foreground/80 focus:outline-none focus:bg-secondary/40 rounded px-1"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                    className="col-span-2 text-center bg-transparent text-muted-foreground focus:outline-none focus:bg-secondary/40 rounded px-1"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(i, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="col-span-4 text-right bg-transparent text-muted-foreground focus:outline-none focus:bg-secondary/40 rounded px-1"
                  />
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
                : 'bg-primary text-primary-foreground glow-primary-sm hover:opacity-90',
            )}
          >
            {generated ? (
              <>
                <CheckCircle size={14} className="mr-2" />
                生成完了!
              </>
            ) : generating ? (
              <>生成中...</>
            ) : (
              <>
                <Download size={14} className="mr-2" />
                PDFをダウンロード
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
