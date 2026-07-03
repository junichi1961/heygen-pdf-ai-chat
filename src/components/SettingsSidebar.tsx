import { useState } from 'react';
import {
  X,
  Key,
  Database,
  BookOpen,
  Cpu,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import { CLAUDE_MODELS } from '../types';
import { ragIngest } from '../lib/api';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type Status = 'connected' | 'disconnected' | 'error';

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
        status === 'connected' && 'bg-emerald-500/15 text-emerald-400',
        status === 'disconnected' && 'bg-muted/80 text-muted-foreground',
        status === 'error' && 'bg-red-500/15 text-red-400',
      )}
    >
      {status === 'connected' ? '接続済み' : status === 'error' ? 'エラー' : '未設定'}
    </span>
  );
}

function Section({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5 text-sm font-medium text-foreground/90">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        {open ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 py-4 space-y-3 bg-[hsl(222_20%_8.5%)]">{children}</div>}
    </div>
  );
}

export default function SettingsSidebar({ isOpen, onClose }: SettingsSidebarProps) {
  const { model, setModel, ragEnabled, setRagEnabled, autoAvatar, setAutoAvatar, status, refreshStatus } =
    useSettings();

  // RAG 取り込みフォーム
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestText, setIngestText] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);

  const handleIngest = async () => {
    if (!ingestText.trim()) return;
    setIngesting(true);
    setIngestMsg(null);
    try {
      const res = await ragIngest({
        title: ingestTitle.trim() || '無題ドキュメント',
        text: ingestText,
      });
      setIngestMsg(`取り込み完了: ${res.chunks} チャンク`);
      setIngestText('');
      setIngestTitle('');
      refreshStatus();
    } catch (e) {
      setIngestMsg(`エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIngesting(false);
    }
  };

  const services: { name: string; status: Status }[] = [
    {
      name: status?.mock ? 'Claude（ローカルモック）' : 'Claude API',
      status: status?.mock || status?.anthropic ? 'connected' : 'disconnected',
    },
    { name: 'HeyGen API', status: status?.heygen ? 'connected' : 'disconnected' },
    {
      name: `RAG (${status?.embeddingProvider ?? '—'})`,
      status: (status?.rag.chunks ?? 0) > 0 ? 'connected' : 'disconnected',
    },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col bg-[hsl(222_20%_9%)] border-l border-border/50 shadow-2xl sidebar-transition',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="text-sm font-semibold text-foreground">設定</h2>
            <p className="text-xs text-muted-foreground mt-0.5">API・データソース管理</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refreshStatus}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              title="状況を更新"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Status overview */}
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                接続状況（ローカルサーバー）
              </span>
            </div>
            <div className="p-3 space-y-1.5">
              {services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        svc.status === 'connected' ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                      )}
                    />
                    <span className="text-xs text-foreground/70">{svc.name}</span>
                  </div>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>

          {/* API Keys (server-managed) */}
          <Section icon={<Key size={14} />} title="APIキー（サーバー管理）" defaultOpen>
            <div className="rounded-lg bg-secondary/30 border border-border/40 p-3 text-xs text-muted-foreground/80 leading-relaxed space-y-2">
              <p>
                APIキーは漏洩防止のため<strong className="text-foreground/80">ブラウザには保存せず</strong>、
                ローカルの <code className="text-cyan-400">server/.env</code> に設定します。
              </p>
              <pre className="bg-[hsl(222_25%_6%)] rounded p-2 text-[10px] text-foreground/70 overflow-x-auto">
{`ANTHROPIC_API_KEY=sk-ant-...
HEYGEN_API_KEY=...
HEYGEN_AVATAR_ID=...`}
              </pre>
              <p>編集後、<code className="text-cyan-400">npm run server</code> を再起動してください。</p>
            </div>
          </Section>

          {/* RAG / Knowledge ingest */}
          <Section icon={<Database size={14} />} title="ナレッジ取り込み / RAG" defaultOpen>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground/80">RAG機能</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  回答時に社内ナレッジを検索・参照
                </p>
              </div>
              <Switch checked={ragEnabled} onCheckedChange={setRagEnabled} className="scale-90" />
            </div>

            <div className="text-[10px] text-muted-foreground/60">
              保存済み: {status?.rag.documents ?? 0} 文書 / {status?.rag.chunks ?? 0} チャンク
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">ドキュメント名</Label>
              <Input
                value={ingestTitle}
                onChange={(e) => setIngestTitle(e.target.value)}
                placeholder="例: 製品カタログ / 提案テンプレート"
                className="h-8 text-xs bg-secondary/50 border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">本文テキスト</Label>
              <textarea
                value={ingestText}
                onChange={(e) => setIngestText(e.target.value)}
                placeholder="NotebookLM等から取り出した知識テキストを貼り付け..."
                rows={4}
                className="w-full text-xs bg-secondary/50 border border-border/60 rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>
            <button
              onClick={handleIngest}
              disabled={ingesting || !ingestText.trim()}
              className="w-full h-8 text-xs border border-primary/30 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {ingesting ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> 取り込み中...
                </>
              ) : (
                <>
                  <RefreshCw size={11} /> インデックスに取り込む
                </>
              )}
            </button>
            {ingestMsg && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                <CheckCircle size={11} className="text-emerald-400" />
                {ingestMsg}
              </div>
            )}

            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-2.5 text-[10px] text-amber-400/80 flex gap-2">
              <BookOpen size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                NotebookLM は公式APIが未公開のため、共有ソースの本文をここに貼り付けて自前RAG化します。
              </span>
            </div>
          </Section>

          {/* AI Model Settings */}
          <Section icon={<Cpu size={14} />} title="AIモデル設定">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">使用モデル</Label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-8 text-xs bg-secondary/50 border border-border/60 rounded-lg px-2 text-foreground focus:outline-none focus:border-primary/50"
              >
                {CLAUDE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground/80">自動アバター応答</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">AI返信をアバターが読み上げ</p>
              </div>
              <Switch checked={autoAvatar} onCheckedChange={setAutoAvatar} className="scale-90" />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">v1.0.0-local</span>
            <span className="text-[10px] text-muted-foreground/50">
              {status ? 'サーバー接続 OK' : 'サーバー未接続'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
