import { useRef, useState, useCallback, useEffect } from 'react';
import type StreamingAvatar from '@heygen/streaming-avatar';
import { getHeyGenToken } from '../lib/api';

/**
 * HeyGen Live(Streaming) Avatar 連携フック。
 *
 * フロー: サーバーから短命トークンを取得 → SDK 初期化 → createStartAvatar で
 * WebRTC セッション開始 → STREAM_READY で MediaStream を <video> に描画 →
 * speak(text) で任意テキストを喋らせる。APIキーはサーバーにのみ存在する。
 *
 * SDK は接続時に動的 import する（@heygen/streaming-avatar の npm 公開物が
 * 不完全なケースがあるため、初期ロードやビルドを巻き込まず、失敗時は error に出す）。
 *
 * ※ 実際に喋らせるには server/.env の HEYGEN_API_KEY と、有効な HEYGEN_AVATAR_ID
 *   （Streaming 対応アバターのID）が必要。
 */
export function useHeyGenAvatar() {
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachStream = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {});
      };
    }
  }, []);

  const connect = useCallback(async () => {
    if (connecting || connected) return;
    setConnecting(true);
    setError(null);
    try {
      const { token, avatarId } = await getHeyGenToken();

      const mod = await import(/* @vite-ignore */ '@heygen/streaming-avatar');
      const { default: StreamingAvatarCtor, AvatarQuality, StreamingEvents } = mod;

      const avatar = new StreamingAvatarCtor({ token });
      avatarRef.current = avatar;

      avatar.on(StreamingEvents.STREAM_READY, (e) => {
        attachStream(e.detail);
        setConnected(true);
        setConnecting(false);
      });
      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => setSpeaking(true));
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => setSpeaking(false));
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setConnected(false);
        setSpeaking(false);
      });

      await avatar.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConnecting(false);
      setConnected(false);
      avatarRef.current = null;
    }
  }, [connecting, connected, attachStream]);

  const disconnect = useCallback(async () => {
    try {
      await avatarRef.current?.stopAvatar();
    } catch {
      /* ignore */
    }
    avatarRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setConnected(false);
    setSpeaking(false);
  }, []);

  /** アバターに任意テキストを喋らせる（AI応答の読み上げなど） */
  const speak = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !avatarRef.current || !connected) return;
      try {
        const { TaskType } = await import(/* @vite-ignore */ '@heygen/streaming-avatar');
        await avatarRef.current.speak({ text: t, taskType: TaskType.REPEAT });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [connected],
  );

  // アンマウント時に確実にセッションを閉じる
  useEffect(() => {
    return () => {
      avatarRef.current?.stopAvatar().catch(() => {});
      avatarRef.current = null;
    };
  }, []);

  return { videoRef, connected, connecting, speaking, error, connect, disconnect, speak };
}
