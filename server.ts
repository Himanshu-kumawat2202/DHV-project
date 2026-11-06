/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Express Server for NIRF Insights
 * Serves the compiled static frontend from dist/ and handles /api/ai-query
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { processNaturalLanguageQuery } from './src/server/nlp/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Endpoint for Natural Language Queries
app.post('/api/ai-query', async (req, res) => {
  try {
    const { query, history, sessionId, skipLLM } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query parameter is required and must be a string', success: false });
      return;
    }
    const result = await processNaturalLanguageQuery(query, history, { sessionId, skipLLM });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: errMsg.replace(/[A-Za-z0-9_-]{30,}/g, '[REDACTED]'),
      success: false,
    });
  }
});

// Serve static assets from dist/
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

// Start listening if run directly from CLI
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectExecution) {
  app.listen(PORT, () => {
    console.log(`NIRF Insights Production Server running at http://localhost:${PORT}`);
  });
}

export default app;
