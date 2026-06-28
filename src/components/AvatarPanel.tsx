import { useState } from 'react';
import { Video, Wifi, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface AvatarPanelProps {
  isSpeaking?: boolean;
}

export default function AvatarPanel({ isSpeaking = false }: AvatarPanelProps) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(isSpeaking);

  const toggleConnect = () => {
    setConnected((prev) => !prev);
    if (!connected) {
      setTimeout(() => setSpeaking(true), 1200);
      setTimeout(() => setSpeaking(false), 4000);
    } else {
      setSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222_25%_6%)] rounded-xl border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center">
            <Video size={10} className="text-cyan-400" />
          </div>
          <span className="text-xs font-semibold text-foreground/80">HeyGen Avatar</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
            onClick={() => setMuted((m) => !m)}
            title={muted ? 'ミュート解除' : 'ミュート'}
          >
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden bg-[hsl(222_25%_5%)]">
        {connected ? (
          <ConnectedView speaking={speaking} muted={muted} />
        ) : (
          <DisconnectedView onConnect={toggleConnect} />
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? (speaking ? '話し中...' : '接続中') : '未接続'}
          </span>
        </div>
        {connected && (
          <button
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            onClick={toggleConnect}
          >
            切断
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectedView({ speaking, muted }: { speaking: boolean; muted: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      {/* Avatar visual */}
      <div
        className={cn(
          'relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all duration-300',
          speaking
            ? 'border-cyan-400/80 avatar-speaking'
            : 'border-border/50'
        )}
      >
        {/* Gradient avatar placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center">
            <span className="text-lg font-bold text-cyan-300">AI</span>
          </div>
        </div>
        {/* Simulated face overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-800/80 to-transparent" />
      </div>

      {/* Speaking indicator */}
      {speaking && !muted && (
        <div className="flex items-center gap-1">
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
        </div>
      )}

      {muted && (
        <div className="flex items-center gap-1.5 text-amber-400/80">
          <VolumeX size={12} />
          <span className="text-xs">ミュート中</span>
        </div>
      )}

      {!speaking && !muted && (
        <span className="text-xs text-muted-foreground/60">待機中</span>
      )}

      {/* Live badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600/80 rounded px-1.5 py-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-[10px] font-bold text-white">LIVE</span>
      </div>
    </div>
  );
}

function DisconnectedView({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
      {/* Placeholder silhouette */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-border/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-slate-600/40 flex items-center justify-center">
            <Video size={16} className="text-muted-foreground/40" />
          </div>
        </div>
        {/* Scan lines */}
        <div className="absolute inset-0 rounded-full overflow-hidden opacity-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-cyan-400"
              style={{ top: `${(i + 1) * 14}%` }}
            />
          ))}
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs font-medium text-foreground/70">アバター未接続</p>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          HeyGen APIキーを設定パネルで<br />設定してください
        </p>
      </div>

      <Button
        size="sm"
        onClick={onConnect}
        className="h-7 text-xs px-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg"
      >
        <Wifi size={11} className="mr-1.5" />
        デモ接続
      </Button>
    </div>
  );
}
