import { useState } from 'react';
import { Video, Wifi, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface AvatarPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  connected: boolean;
  connecting: boolean;
  speaking: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function AvatarPanel({
  videoRef,
  connected,
  connecting,
  speaking,
  error,
  onConnect,
  onDisconnect,
}: AvatarPanelProps) {
  const [muted, setMuted] = useState(false);

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
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden bg-[hsl(222_25%_5%)]">
        {/* 実ストリームの描画先。常にマウントしておき srcObject を差し替える */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity',
            connected ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        />

        {connected && (
          <>
            {speaking && !muted && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
              </div>
            )}
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600/80 rounded px-1.5 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white">LIVE</span>
            </div>
          </>
        )}

        {!connected && (
          <DisconnectedView connecting={connecting} error={error} onConnect={onConnect} />
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              connected ? 'bg-emerald-500' : connecting ? 'bg-amber-500' : 'bg-muted-foreground/40',
            )}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? (speaking ? '話し中...' : '接続中') : connecting ? '接続処理中...' : '未接続'}
          </span>
        </div>
        {connected && (
          <button
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            onClick={onDisconnect}
          >
            切断
          </button>
        )}
      </div>
    </div>
  );
}

function DisconnectedView({
  connecting,
  error,
  onConnect,
}: {
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-border/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-slate-600/40 flex items-center justify-center">
            <Video size={16} className="text-muted-foreground/40" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs font-medium text-foreground/70">アバター未接続</p>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          server/.env に HeyGen APIキー・<br />アバターIDを設定して接続
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-red-400/80 max-w-[180px] text-center">
          <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        size="sm"
        onClick={onConnect}
        disabled={connecting}
        className="h-7 text-xs px-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg"
      >
        {connecting ? (
          <>
            <Loader2 size={11} className="mr-1.5 animate-spin" /> 接続中...
          </>
        ) : (
          <>
            <Wifi size={11} className="mr-1.5" /> 接続
          </>
        )}
      </Button>
    </div>
  );
}
