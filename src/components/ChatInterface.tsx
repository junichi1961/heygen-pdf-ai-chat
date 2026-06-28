import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface ChatInterfaceProps {
  onNewMessage?: (message: Message) => void;
}

const DEMO_RESPONSES = [
  `承知いたしました。ご要件を整理いたします。

お客様のニーズを踏まえ、以下のようなソリューションをご提案できます。

**提案内容**
1. AIエージェント基盤の構築
2. 既存システムとのAPI連携
3. 運用保守サポート

詳細なお見積もりを作成いたします。画面右下の「PDF生成」ボタンから見積書をダウンロードいただけます。`,
  `ご質問ありがとうございます。具体的なご要件をお聞かせいただけますか？

- 対象ユーザー数
- 必要な機能一覧
- 希望納期
- 予算感

これらの情報をもとに、最適なプランをご提案いたします。`,
  `はい、その点については十分に対応可能です。

弊社では以下の技術スタックで対応しております：
- **フロントエンド**: React / TypeScript
- **バックエンド**: Node.js / Python
- **AI基盤**: Claude API / GPT-4
- **インフラ**: AWS / GCP

ご希望の要件に合わせてカスタマイズいたします。`,
];

function simulateStream(
  text: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
) {
  let i = 0;
  const interval = setInterval(() => {
    if (i < text.length) {
      const chunkSize = Math.floor(Math.random() * 4) + 1;
      onChunk(text.slice(i, i + chunkSize));
      i += chunkSize;
    } else {
      clearInterval(interval);
      onDone();
    }
  }, 18);
  return () => clearInterval(interval);
}

export default function ChatInterface({ onNewMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'こんにちは！AIアシスタントです。ご質問やご要件をお気軽にお聞かせください。見積書・提案書の作成もサポートいたします。',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

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

    setMessages((prev) => [...prev, userMsg]);
    onNewMessage?.(userMsg);
    setInput('');
    setIsStreaming(true);

    const responseText = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
    const assistantId = (Date.now() + 1).toString();

    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    stopStreamRef.current = simulateStream(
      responseText,
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
        const finalMsg: Message = {
          id: assistantId,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };
        onNewMessage?.(finalMsg);
        setIsStreaming(false);
      }
    );
  }, [input, isStreaming, onNewMessage]);

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
                : 'opacity-40'
            )}
          >
            <Send size={14} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/50 text-center mt-2">
          Enter で送信 · Shift+Enter で改行
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
            : 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400'
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
              : 'bg-[hsl(222_20%_13%)] border border-border/50 text-foreground/90 rounded-tl-sm'
          )}
        >
          <MessageContent content={message.content} streaming={message.streaming} />
        </div>
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
        // Bold inline
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}
