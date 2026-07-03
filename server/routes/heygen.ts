import { Router } from 'express';
import { config } from '../env';

export const heygenRouter = Router();

/**
 * HeyGen Streaming(Live) Avatar 用のセッショントークンを発行する。
 * APIキーはサーバーに秘匿し、フロントには短命トークンだけを渡す。
 * フロント側 SDK(@heygen/streaming-avatar) はこのトークンで WebRTC 接続する。
 */
heygenRouter.post('/token', async (_req, res) => {
  if (!config.heygenApiKey) {
    return res
      .status(500)
      .json({ error: 'サーバーに HEYGEN_API_KEY が設定されていません（server/.env）' });
  }

  try {
    const resp = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.heygenApiKey,
      },
    });

    if (!resp.ok) {
      return res
        .status(502)
        .json({ error: `HeyGen トークン発行に失敗: ${resp.status} ${await resp.text()}` });
    }

    const json = (await resp.json()) as { data?: { token?: string } };
    const token = json.data?.token;
    if (!token) {
      return res.status(502).json({ error: 'HeyGen 応答にトークンがありません' });
    }

    // フロントが createStartAvatar で使う既定アバターIDも一緒に返す
    res.json({ token, avatarId: config.heygenAvatarId || null });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});
