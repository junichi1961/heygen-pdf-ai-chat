import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // @heygen/streaming-avatar は npm 公開物が不完全なため事前バンドル対象から除外。
    // 実体は接続時に動的 import する（正常な SDK が入っている環境でのみ動作）。
    exclude: ['lucide-react', '@heygen/streaming-avatar'],
  },
  server: {
    // フロント(:5173)からの /api 呼び出しをローカルの Express(:8787) に転送。
    // これにより本番でもブラウザは APIキーに触れず、同一オリジンで動く。
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
