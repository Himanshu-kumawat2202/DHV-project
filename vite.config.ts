import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function aiQueryPlugin(): Plugin {
  return {
    name: 'ai-query-api',
    configureServer(server) {
      server.middlewares.use('/api/ai-query', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer | string) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { query, history, sessionId, skipLLM } = JSON.parse(body || '{}');
            if (!query || typeof query !== 'string') {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Query parameter is required', success: false }));
              return;
            }
            const { processNaturalLanguageQuery } = await import('./src/server/nlp/index.ts');
            const result = await processNaturalLanguageQuery(query, history, { sessionId, skipLLM });
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: errMsg.replace(/[A-Za-z0-9_-]{30,}/g, '[REDACTED]'), success: false }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      'process.env': {},
    },
    plugins: [react(), tailwindcss(), aiQueryPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
