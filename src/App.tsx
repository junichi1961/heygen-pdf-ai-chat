import { useState } from 'react';
import {
  MessageSquare,
  Settings,
  FileText,
  Bot,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  History,
  Plus,
} from 'lucide-react';
import ChatInterface, { Message } from './components/ChatInterface';
import AvatarPanel from './components/AvatarPanel';
import PdfGenerator from './components/PdfGenerator';
import SettingsSidebar from './components/SettingsSidebar';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { useHeyGenAvatar } from './hooks/useHeyGenAvatar';
import type { QuoteDraft } from './types';
import { cn } from './lib/utils';
import './App.css';

interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  { id: '1', title: '現在のチャット', preview: 'AIエージェント基盤の構築について...', time: '今すぐ' },
  { id: '2', title: 'システム統合案件', preview: 'API連携のご提案内容が...', time: '昨日' },
  { id: '3', title: 'UI/UX改善提案', preview: 'ユーザー体験向上のために...', time: '2日前' },
];

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  );
}

function AppInner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [activeConv, setActiveConv] = useState('1');
  const [conversations] = useState(INITIAL_CONVERSATIONS);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>(null);

  const { autoAvatar } = useSettings();
  const avatar = useHeyGenAvatar();

  return (
    <div className="flex h-screen w-screen bg-[hsl(222_25%_6%)] overflow-hidden">
      {/* Left navigation sidebar */}
      <div
        className={cn(
          'flex flex-col border-r border-border/40 bg-[hsl(222_25%_7%)] sidebar-transition flex-shrink-0',
          navCollapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/40">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 glow-primary-sm">
            <Sparkles size={14} className="text-white" />
          </div>
          {!navCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-foreground leading-none gradient-text">NexusAI</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Agent Platform</p>
            </div>
          )}
        </div>

        {/* New chat */}
        <div className="px-2 pt-3 pb-2">
          <button
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary transition-all text-xs font-medium',
              navCollapsed && 'justify-center px-2'
            )}
          >
            <Plus size={13} className="flex-shrink-0" />
            {!navCollapsed && 'New Chat'}
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-2 space-y-0.5">
          {[
            { icon: MessageSquare, label: 'チャット', active: true },
            { icon: LayoutDashboard, label: 'ダッシュボード', active: false },
            { icon: History, label: '履歴', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                active
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                navCollapsed && 'justify-center px-2'
              )}
              title={navCollapsed ? label : undefined}
            >
              <Icon size={14} className="flex-shrink-0" />
              {!navCollapsed && label}
            </button>
          ))}
        </nav>

        {/* Conversations */}
        {!navCollapsed && (
          <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              最近の会話
            </p>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all group',
                  activeConv === conv.id
                    ? 'bg-secondary/70 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-medium truncate">{conv.title}</span>
                  <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{conv.time}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{conv.preview}</p>
              </button>
            ))}
          </div>
        )}

        {/* Bottom collapse toggle */}
        <div className="mt-auto border-t border-border/40 p-2">
          <button
            onClick={() => setNavCollapsed((c) => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            title={navCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
          >
            {navCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-[hsl(222_20%_8%)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">AIエージェント</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">オンライン</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPdfOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border hover:bg-secondary/70 transition-all"
            >
              <FileText size={12} />
              見積書PDF
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              title="設定"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Chat + Avatar */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <ChatInterface
              onNewMessage={(msg) => setMessages((prev) => [...prev, msg])}
              onAssistantComplete={(text) => {
                if (autoAvatar && avatar.connected) avatar.speak(text);
              }}
              onQuoteDraft={(draft) => {
                setQuoteDraft(draft);
                setPdfOpen(true); // 会話から見積が来たら自動でPDFウィンドウを開く
              }}
            />
          </div>

          {/* Avatar panel */}
          <div className="w-56 flex-shrink-0 p-3 border-l border-border/30">
            <AvatarPanel
              videoRef={avatar.videoRef}
              connected={avatar.connected}
              connecting={avatar.connecting}
              speaking={avatar.speaking}
              error={avatar.error}
              onConnect={avatar.connect}
              onDisconnect={avatar.disconnect}
            />
          </div>
        </div>
      </div>

      {/* Modals / Drawers */}
      <SettingsSidebar isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PdfGenerator
        messages={messages}
        draft={quoteDraft}
        isOpen={pdfOpen}
        onClose={() => setPdfOpen(false)}
      />
    </div>
  );
}
