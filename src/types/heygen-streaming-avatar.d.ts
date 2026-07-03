/**
 * @heygen/streaming-avatar の最小型シム。
 *
 * 注意: 現状 npm 公開物(2.1.1)には lib/ のビルド実体・型が同梱されていないため、
 * ここでフックが使う API 面だけを宣言している。SDK を正しく解決できる環境
 * （正常なパッケージ or ローカルビルド）では実体が読み込まれ、この宣言は型付けだけを担う。
 */
declare module '@heygen/streaming-avatar' {
  export enum AvatarQuality {
    Low = 'low',
    Medium = 'medium',
    High = 'high',
  }

  export enum StreamingEvents {
    STREAM_READY = 'stream_ready',
    STREAM_DISCONNECTED = 'stream_disconnected',
    AVATAR_START_TALKING = 'avatar_start_talking',
    AVATAR_STOP_TALKING = 'avatar_stop_talking',
  }

  export enum TaskType {
    REPEAT = 'repeat',
    TALK = 'talk',
  }

  export interface StartAvatarRequest {
    quality?: AvatarQuality;
    avatarName: string;
    [key: string]: unknown;
  }

  export default class StreamingAvatar {
    constructor(opts: { token: string; basePath?: string });
    on(event: string, handler: (event: { detail: MediaStream } & Record<string, unknown>) => void): void;
    createStartAvatar(req: StartAvatarRequest): Promise<unknown>;
    speak(req: { text: string; taskType?: TaskType }): Promise<unknown>;
    stopAvatar(): Promise<unknown>;
  }
}
