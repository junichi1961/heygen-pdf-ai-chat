import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';
import { streamChat, type ChatWireMessage } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import type { RagSource, QuoteDraft } from '../types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
  sources?: RagSource[];
}

interface ChatInterfaceProps {
  onNewMessage?: (message: Message) => void;
  /** アシスタント応答が確定したときに全文を通知（アバター読み上げ等に使用） */
  onAssistantComplete?: (text: string) => void;
  /** サーバーが会話から自動生成した見積ドラフトを通知（PDFを自動表示） */
  onQuoteDraft?: (draft: QuoteDraft) => void;
}

const GREETING: Message = {
  id: '0',
  role: 'assistant',
  content:
    'こんにちは！AIアシスタントです。ご質問やご要件をお気軽にお聞かせください。見積書・提案書の作成もサポートいたします。',
  timestamp: new Date(),
};

export default function ChatInterface({
  onNewMessage,
  onAssistantComplete,
  onQuoteDraft,
}: ChatInterfaceProps) {
  const { model, ragEnabled } = useSettings();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    // 送信するのは「今表示している履歴＋今回のユーザー発言」（空メッセージは除く）
    const history: ChatWireMessage[] = [...messages, userMsg]
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    onNewMessage?.(userMsg);
    setInput('');
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), streaming: true },
    ]);

    const ac = new AbortController();
    abortRef.current = ac;
    let acc = '';

    const finalize = () => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: acc, streaming: false } : m)),
      );
      onNewMessage?.({ id: assistantId, role: 'assistant', content: acc, timestamp: new Date() });
      onAssistantComplete?.(acc);
      setIsStreaming(false);
    };

    streamChat(
      { messages: history, model, ragEnabled },
      {
        onSources: (sources) =>
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))),
        onQuote: (draft) => onQuoteDraft?.(draft),
        onDelta: (delta) => {
          acc += delta;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          );
        },
        onDone: finalize,
        onError: (msg) => {
          acc = acc || `⚠️ エラー: ${msg}`;
          finalize();
        },
        signal: ac.signal,
      },
    ).catch((e) => {
      acc = acc || `⚠️ 通信エラー: ${e instanceof Error ? e.message : String(e)}`;
      finalize();
    });
  }, [input, isStreaming, messages, model, ragEnabled, onNewMessage, onAssistantComplete, onQuoteDraft]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-end gap-2 bg-secondary/50 rounded-xl border border-border/60 p-2 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_1px_hsl(199_89%_48%/0.2)]">
          <button
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            title="ファイル添付"
          >
            <Paperclip size={16} />
          </button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力... (Shift+Enterで改行)"
            className="flex-1 min-h-[40px] max-h-[160px] resize-none bg-transparent border-none shadow-none focus-visible:ring-0 text-sm leading-relaxed p-1"
            rows={1}
          />
          <button
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            title="音声入力"
          >
            <Mic size={16} />
          </button>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            size="sm"
            className={cn(
              'rounded-lg px-3 h-8 transition-all',
              input.trim() && !isStreaming
                ? 'bg-primary text-primary-foreground glow-primary-sm hover:opacity-90'
                : 'opacity-40',
            )}
          >
            <Send size={14} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/50 text-center mt-2">
          Enter で送信 · Shift+Enter で改行 {ragEnabled && '· RAG有効'}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 message-enter', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5',
          isUser
            ? 'bg-primary/20 text-primary border border-primary/30'
            : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400',
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[78%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary/20 border border-primary/25 text-foreground rounded-tr-sm'
              : 'bg-[hsl(222_20%_13%)] border border-border/50 text-foreground/90 rounded-tl-sm',
          )}
        >
          <MessageContent content={message.content} streaming={message.streaming} />
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <BookOpen size={10} /> 参考にした社内ナレッジ
            </span>
            {message.sources.map((s, i) => (
              <span key={i} className="text-[10px] text-muted-foreground/50 truncate max-w-[300px]">
                • {s.title}（類似度 {s.score}）
              </span>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground/50 px-1">
          {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  const lines = content.split('\n');

  return (
    <span className={cn(streaming && 'typing-cursor')}>
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <span key={i}>
              <strong className="text-foreground font-semibold">{line.slice(2, -2)}</strong>
              {i < lines.length - 1 && <br />}
            </span>
          );
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="text-foreground font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}
