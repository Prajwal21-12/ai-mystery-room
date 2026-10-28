import { Router } from 'express';
import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: getDatabaseStatus(),
      generation: env.GEMINI_API_KEY && env.GEMINI_MODEL ? 'configured' : 'not_configured',
    },
  });
});
