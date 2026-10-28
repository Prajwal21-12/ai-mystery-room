import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { createCasesRouter } from './routes/cases.js';

export function createApp({ generateCase, store } = {}) {
  const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/cases', createCasesRouter({ generateCase, store }));

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API route is not available in this release.',
    },
  });
});

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Please send a valid JSON request.' },
    });
  }

  console.error('Unhandled API operation failed.');
  return response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' },
  });
});

  return app;
}

export const app = createApp();
