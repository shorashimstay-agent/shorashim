import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves the site at the root of its custom domain (public/CNAME).
    base: '/',
    plugins: [react(), tailwindcss()],
    build: {
      // Besides the home page, each legal page is its own HTML file, so /terms/ and friends work as
      // real URLs on GitHub Pages.
      rollupOptions: {
        input: Object.fromEntries(
          ['index.html', ...['terms', 'privacy', 'accessibility'].flatMap((p) => [`${p}/index.html`, `en/${p}/index.html`])].map((f) => [
            f.replace(/\/?index\.html$/, '') || 'home',
            path.resolve(__dirname, f),
          ])
        ),
      },
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
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
