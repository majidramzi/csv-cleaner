/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Redirects root "/" requests in local dev/preview servers to "/csv-cleaner/"
 * while keeping the production bundle strictly built for GitHub Pages "/csv-cleaner/".
 */
function redirectRootToBasePlugin(basePath: string): Plugin {
  const redirectMiddleware = (
    req: { url?: string },
    res: { writeHead: (status: number, headers: Record<string, string>) => void; end: () => void },
    next: () => void
  ) => {
    if (req.url === '/' || req.url === '') {
      res.writeHead(302, { Location: basePath });
      res.end();
      return;
    }
    next();
  };

  return {
    name: 'redirect-root-to-base',
    configureServer(server) {
      server.middlewares.use(redirectMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectMiddleware);
    },
  };
}

export default defineConfig({
  base: '/csv-cleaner/',
  plugins: [react(), redirectRootToBasePlugin('/csv-cleaner/')],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          table: ['@tanstack/react-table'],
          parsers: ['papaparse', 'xlsx'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
