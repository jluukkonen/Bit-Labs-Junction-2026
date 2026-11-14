import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const nemotronKey = env.VERDA_INFERENCE_KEY || 'dc_87f087e0b359b0ce41e790fcbffb0e913936d257c1e9131fd8c5b7323f3c271d6d8791ade42dc33b683ca957d998525420dec6fb3be1eca8c4d04f3dfb82bf2e571431922b1bbc9bb600537e1329ea2bd2a9a3d0748f7413ff2d75d69b9bae0c61c621230210e0ac0b763ff0e7cf2dc68958a45f2308319842fd0cfc0f280516';
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    server: {
      port: 5173,
      proxy: {
        '/api/nemotron': {
          target: 'https://containers.datacrunch.io/nemotron-3-5-super-vl-b300/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nemotron/, ''),
          headers: {
            Authorization: `Bearer ${nemotronKey}`,
          },
        },
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
          headers: {
            'x-goog-api-key': geminiKey,
          },
        },
      },
    },
  };
});
