import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { getDatabaseStatus } from '../src/config/database.js';

describe('GET /api/v1/health', () => {
  it('returns liveness and reports dependency configuration without claiming a live connection', async () => {
    const response = await request(app).get('/api/v1/health');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      data: {
        status: 'ok',
        database: getDatabaseStatus(),
        generation: env.GEMINI_API_KEY && env.GEMINI_MODEL ? 'configured' : 'not_configured',
      },
    });
  });

  it('returns the documented JSON error for unknown routes', async () => {
    const response = await request(app).get('/api/v1/not-a-route');

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
