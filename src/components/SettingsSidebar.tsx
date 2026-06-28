import { useState } from 'react';
import {
  X,
  Key,
  Database,
  BookOpen,
  Cpu,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
}

const SERVICES: ServiceStatus[] = [
  { name: 'Claude API', status: 'disconnected' },
  { name: 'HeyGen API', status: 'disconnected' },
  { name: 'Vector DB', status: 'disconnected' },
  { name: 'NotebookLM', status: 'disconnected' },
];

function StatusBadge({ status }: { status: ServiceStatus['status'] }) {
  return (
    <span
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
        status === 'connected' && 'bg-emerald-500/15 text-emerald-400',
        status === 'disconnected' && 'bg-muted/80 text-muted-foreground',
        status === 'error' && 'bg-red-500/15 text-red-400'
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
      {open && (
        <div className="px-4 py-4 space-y-3 bg-[hsl(222_20%_8.5%)]">{children}</div>
      )}
    </div>
  );
}

function ApiKeyField({ label, placeholder }: { label: string; placeholder: string }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!value) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs bg-secondary/50 border-border/60 font-mono"
        />
        <button
          onClick={handleSave}
          className={cn(
            'px-3 h-8 text-xs rounded-lg border transition-all whitespace-nowrap',
            saved
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          {saved ? '保存済み' : '保存'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsSidebar({ isOpen, onClose }: SettingsSidebarProps) {
  const [ragEnabled, setRagEnabled] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [autoAvatar, setAutoAvatar] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col bg-[hsl(222_20%_9%)] border-l border-border/50 shadow-2xl sidebar-transition',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <h2 className="text-sm font-semibold text-foreground">設定</h2>
            <p className="text-xs text-muted-foreground mt-0.5">API・データソース管理</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Status overview */}
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">接続状況</span>
            </div>
            <div className="p-3 space-y-1.5">
              {SERVICES.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span className="text-xs text-foreground/70">{svc.name}</span>
                  </div>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>

          {/* API Keys */}
          <Section icon={<Key size={14} />} title="APIキー設定" defaultOpen>
            <ApiKeyField label="Claude API Key" placeholder="sk-ant-..." />
            <ApiKeyField label="HeyGen API Key" placeholder="heygen_..." />
            <ApiKeyField label="OpenAI API Key (補助)" placeholder="sk-..." />
            <div className="pt-1 flex items-center gap-2 text-xs text-muted-foreground/60">
              <AlertCircle size={11} />
              <span>キーはローカルにのみ保存されます</span>
            </div>
          </Section>

          {/* RAG / Vector DB */}
          <Section icon={<Database size={14} />} title="ベクターDB / RAG">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground/80">RAG機能</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ドキュメント検索を有効化</p>
              </div>
              <Switch
                checked={ragEnabled}
                onCheckedChange={setRagEnabled}
                className="scale-90"
              />
            </div>

            <ApiKeyField label="Supabase Vector URL" placeholder="https://..." />

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ベクターDB種別</Label>
              <select className="w-full h-8 text-xs bg-secondary/50 border border-border/60 rounded-lg px-2 text-foreground focus:outline-none focus:border-primary/50">
                <option>Supabase pgvector</option>
                <option>Pinecone</option>
                <option>Weaviate</option>
                <option>Chroma</option>
              </select>
            </div>

            {ragEnabled && (
              <button className="w-full h-8 text-xs border border-primary/30 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                <RefreshCw size={11} />
                インデックスを再構築
              </button>
            )}
          </Section>

          {/* NotebookLM */}
          <Section icon={<BookOpen size={14} />} title="NotebookLM連携">
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 text-xs text-amber-400/80 flex gap-2">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>NotebookLMのAPI公開は準備中です。現在はダミーUIとして表示しています。</span>
            </div>
            <ApiKeyField label="NotebookLM API Key (準備中)" placeholder="coming soon..." />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ノートブックID</Label>
              <Input
                placeholder="notebook-XXXX"
                disabled
                className="h-8 text-xs bg-secondary/30 border-border/40 opacity-50"
              />
            </div>
          </Section>

          {/* AI Model Settings */}
          <Section icon={<Cpu size={14} />} title="AIモデル設定">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">使用モデル</Label>
              <select className="w-full h-8 text-xs bg-secondary/50 border border-border/60 rounded-lg px-2 text-foreground focus:outline-none focus:border-primary/50">
                <option>claude-3-5-sonnet-20241022</option>
                <option>claude-3-opus-20240229</option>
                <option>claude-3-haiku-20240307</option>
                <option>gpt-4o</option>
                <option>gpt-4o-mini</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Temperature</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-xs text-muted-foreground w-8 text-right">0.7</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground/80">ストリーミング</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">リアルタイム返信</p>
              </div>
              <Switch
                checked={streamingEnabled}
                onCheckedChange={setStreamingEnabled}
                className="scale-90"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground/80">自動アバター応答</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">AI返信をアバターが読み上げ</p>
              </div>
              <Switch
                checked={autoAvatar}
                onCheckedChange={setAutoAvatar}
                className="scale-90"
              />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50">v1.0.0-beta</span>
            <button className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1">
              <ExternalLink size={10} />
              ドキュメント
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
