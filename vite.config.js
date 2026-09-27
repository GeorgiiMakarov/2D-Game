import { defineConfig } from 'vite';

// HMR_PUBLIC=1 — когда dev-сервер отдаётся наружу через https-прокси
// (облачная песочница, ngrok, Codespaces). Локально ничего настраивать не нужно.
const publicHmr = process.env.HMR_PUBLIC === '1';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    cors: true,
    hmr: publicHmr ? { clientPort: 443, protocol: 'wss' } : true,
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0 },
});
