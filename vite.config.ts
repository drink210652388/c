import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {VitePWA} from 'vite-plugin-pwa';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'Gemini_Generated_Image_3o88033o88033o88.png',
          'apple-touch-icon.png',
          'masked-icon.svg',
        ],
        manifest: {
          name: 'React Example',
          short_name: 'ReactExample',
          description: 'React Example PWA',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/Gemini_Generated_Image_3o88033o88033o88.png',
              sizes: '1024x1024',
              type: 'image/png',
            },
            {
              src: '/Gemini_Generated_Image_3o88033o88033o88.png',
              sizes: '1024x1024',
              type: 'image/png',
            },
            {
              src: '/Gemini_Generated_Image_3o88033o88033o88.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
