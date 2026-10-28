import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { formatMongoConnectionError } from '../src/config/database.js';

describe('MongoDB configuration diagnostics', () => {
  it('loads the optional root environment value without exposing it', () => {
    if (env.MONGODB_URI) {
      const parsed = new URL(env.MONGODB_URI);
      assert.equal(['mongodb:', 'mongodb+srv:'].includes(parsed.protocol), true);
      assert.equal(Boolean(parsed.hostname), true);
    }
  });

  it('logs only the error name, code, and a sanitized message', () => {
    const error = new Error('Could not parse mongodb+srv://alice:ultraSecret@cluster.example/db?password=secondSecret; authentication failed for user alice');
    error.name = 'MongoServerError';
    error.code = 'ECONNREFUSED';
    const safe = formatMongoConnectionError(error);
    const serialized = JSON.stringify(safe);

    assert.deepEqual(Object.keys(safe).sort(), ['errorCode', 'errorName', 'sanitizedMessage']);
    assert.equal(safe.errorName, 'MongoServerError');
    assert.equal(safe.errorCode, 'ECONNREFUSED');
    assert.equal(serialized.includes('alice'), false);
    assert.equal(serialized.includes('ultraSecret'), false);
    assert.equal(serialized.includes('secondSecret'), false);
    assert.equal(serialized.includes('cluster.example'), false);
  });

  it('uses the underlying server error code and message when selection wraps it', () => {
    const wrapped = new Error('Server selection failed');
    wrapped.name = 'MongooseServerSelectionError';
    wrapped.reason = { servers: new Map([['node', { error: Object.assign(new Error('querySrv ECONNREFUSED _mongodb._tcp.cluster.example'), { code: 'ECONNREFUSED' }) }]]) };

    assert.deepEqual(formatMongoConnectionError(wrapped), {
      errorName: 'MongooseServerSelectionError',
      errorCode: 'ECONNREFUSED',
      sanitizedMessage: 'querySrv ECONNREFUSED _mongodb._tcp.cluster.example',
    });
  });
});
