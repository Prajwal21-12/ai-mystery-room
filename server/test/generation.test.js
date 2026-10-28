import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { findMockCase, mockCases } from '../src/fixtures/mockCases.js';
import { CaseGenerationError, createGeminiCaseGenerator } from '../src/services/geminiCaseGenerator.js';
import { createGameplayStore } from '../src/services/gameplayStore.js';

const input = { scenario: 'A rare map vanishes from a locked archive overnight.', difficulty: 'easy', category: 'historical_mystery' };

function modelJson(record) {
  const { case: caseData, solution, hints } = record;
  const { id, originalScenario, category, difficulty, suspectCount, clueCount, hintLimit, status, source, createdAt, ...payloadCase } = caseData;
  return JSON.stringify({ case: payloadCase, solution, hints });
}

function generatorFor(text, { config = { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model', GEMINI_REQUEST_TIMEOUT_MS: 120000 }, onRequest } = {}) {
  return createGeminiCaseGenerator({
    getConfig: () => config,
    makeId: () => 'generated-test-id',
    now: () => new Date('2026-10-26T12:00:00.000Z'),
    clientFactory: ({ apiKey, timeout }) => {
      assert.equal(apiKey, config.GEMINI_API_KEY);
      assert.equal(timeout, config.GEMINI_REQUEST_TIMEOUT_MS);
      return { models: { generateContent: async (params) => {
        onRequest?.(params);
        return typeof text === 'function' ? text() : { text };
      } } };
    },
  });
}

describe('Gemini case generation', () => {
  it('generates valid cases with exact counts and keeps private solution fields out of the API response', async () => {
    for (const record of mockCases) {
      const expected = record.case.difficulty;
      const generateCase = generatorFor(modelJson(record), {
        onRequest: (params) => {
          assert.equal(params.model, 'test-model');
          assert.equal(params.config.responseMimeType, 'application/json');
          assert.equal(params.config.thinkingConfig.thinkingLevel, 'low');
          assert.equal('temperature' in params.config, false);
          assert.match(params.contents, new RegExp(`Difficulty: ${expected}`));
        },
      });
      const app = createApp({ generateCase });
      const response = await request(app).post('/api/v1/cases').send({ ...input, difficulty: expected });

      assert.equal(response.status, 201);
      const publicCase = response.body.data.case;
      assert.equal(response.body.data.persisted, false);
      assert.equal(publicCase.source, 'generated');
      assert.equal(publicCase.isDevelopmentFixture, false);
      assert.equal(publicCase.suspects.length, record.case.suspects.length);
      assert.equal(publicCase.clues.length, record.case.clues.length);
      assert.equal(publicCase.hintLimit, record.hints.length);
      const serialized = JSON.stringify(publicCase);
      for (const privateField of ['culpritId', 'solutionExplanation', 'supportingEvidenceIds', 'supportingClueIds', 'suspectExplanations', 'hints']) {
        assert.equal(serialized.includes(privateField), false, `Public response exposed ${privateField}`);
      }
      assert.equal(serialized.includes(record.solution.solutionExplanation), false);
    }
  });

  it('rejects invalid request data before calling the Gemini SDK', async () => {
    const app = createApp({ generateCase: async () => assert.fail('Generator must not run for invalid input') });
    const shortScenario = await request(app).post('/api/v1/cases').send({ ...input, scenario: 'short' });
    const unknownField = await request(app).post('/api/v1/cases').send({ ...input, clueCount: 5 });
    const invalidDifficulty = await request(app).post('/api/v1/cases').send({ ...input, difficulty: 'expert' });
    assert.equal(shortScenario.status, 400);
    assert.equal(unknownField.status, 400);
    assert.equal(invalidDifficulty.status, 400);
  });

  it('returns a safe configuration error when the key or model is missing', async () => {
    for (const config of [
      { GEMINI_MODEL: 'test-model' },
      { GEMINI_API_KEY: 'test-key' },
    ]) {
      const app = createApp({ generateCase: generatorFor('', { config }) });
      const response = await request(app).post('/api/v1/cases').send(input);
      assert.equal(response.status, 503);
      assert.equal(response.body.error.code, 'GENERATION_NOT_CONFIGURED');
      assert.equal(JSON.stringify(response.body).includes('test-key'), false);
    }
  });

  it('uses a two-minute SDK timeout when the server config omits an override', async () => {
    let actualTimeout;
    const generateCase = createGeminiCaseGenerator({
      getConfig: () => ({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' }),
      clientFactory: ({ timeout }) => {
        actualTimeout = timeout;
        return { models: { generateContent: async () => ({ text: '{malformed' }) } };
      },
    });
    const response = await request(createApp({ generateCase })).post('/api/v1/cases').send(input);
    assert.equal(actualTimeout, 120000);
    assert.equal(response.body.error.code, 'MALFORMED_MODEL_OUTPUT');
  });

  it('distinguishes malformed JSON, generated schema failures, and case consistency failures', async () => {
    const malformed = await request(createApp({ generateCase: generatorFor('{not-json') })).post('/api/v1/cases').send(input);
    const malformedRecord = structuredClone(findMockCase('fixture-easy-last-bell'));
    delete malformedRecord.case.clues[0].title;
    const schemaInvalid = await request(createApp({ generateCase: generatorFor(modelJson(malformedRecord)) })).post('/api/v1/cases').send(input);
    const record = structuredClone(findMockCase('fixture-easy-last-bell'));
    record.case.clues[0].evidenceIds = ['missing'];
    const broken = await request(createApp({ generateCase: generatorFor(modelJson(record)) })).post('/api/v1/cases').send(input);
    assert.equal(malformed.status, 502);
    assert.equal(malformed.body.error.code, 'MALFORMED_MODEL_OUTPUT');
    assert.equal(schemaInvalid.status, 502);
    assert.equal(schemaInvalid.body.error.code, 'GENERATED_CASE_SCHEMA_INVALID');
    assert.equal(broken.status, 502);
    assert.equal(broken.body.error.code, 'GENERATED_CASE_VALIDATION_FAILED');
    assert.equal(JSON.stringify(broken.body).includes('easy_suspect_eli'), false);
  });

  it('keeps rate-limit errors safe and offers a fixture for provider and client timeouts', async () => {
    for (const [failure, expectedStatus, expectedCode, isFallback] of [
      [Object.assign(new Error('private provider detail'), { status: 429 }), 429, 'GENERATION_RATE_LIMITED', false],
      [Object.assign(new Error(JSON.stringify({ error: { code: 504, status: 'DEADLINE_EXCEEDED', message: 'private provider detail' } })), { status: 504, name: 'ApiError' }), 201, 'GENERATION_PROVIDER_DEADLINE', true],
      [Object.assign(new Error('private local timeout detail'), { name: 'RequestTimeoutError' }), 201, 'GENERATION_CLIENT_TIMEOUT', true],
    ]) {
      const generator = createGeminiCaseGenerator({
        getConfig: () => ({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' }),
        clientFactory: () => ({ models: { generateContent: async () => { throw failure; } } }),
      });
      const response = await request(createApp({ generateCase: generator })).post('/api/v1/cases').send(input);
      assert.equal(response.status, expectedStatus);
      if (isFallback) {
        assert.equal(response.body.data.generation.method, 'prebuilt_fixture_fallback');
        assert.equal(response.body.data.generation.reason, expectedCode);
      } else {
        assert.equal(response.body.error.code, expectedCode);
      }
      assert.equal(JSON.stringify(response.body).includes('private provider detail'), false);
    }
  });

  it('offers the matching validated fixture after provider unavailability or timeout and supports full gameplay', async () => {
    const failures = [
      new CaseGenerationError('GENERATION_PROVIDER_UNAVAILABLE', 'Gemini is temporarily unavailable.', 502),
      new CaseGenerationError('GENERATION_CLIENT_TIMEOUT', 'Gemini request timed out.', 504),
    ];

    const baseScores = { easy: 100, medium: 150, hard: 200 };
    for (const fixture of mockCases) {
      for (const failure of failures) {
      const store = createGameplayStore({ isConnected: () => false });
      const app = createApp({ generateCase: async () => { throw failure; }, store });
      const response = await request(app).post('/api/v1/cases').send({ ...input, difficulty: fixture.case.difficulty });
      assert.equal(response.status, 201);
      assert.equal(response.body.data.generation.method, 'prebuilt_fixture_fallback');
      assert.equal(response.body.data.generation.reason, failure.code);
      assert.equal(response.body.data.case.id, fixture.case.id);
      assert.equal(response.body.data.case.source, 'development_fixture');
      assert.equal(response.body.data.case.suspects.length, fixture.case.suspects.length);
      assert.equal(response.body.data.case.clues.length, fixture.case.clues.length);
      assert.equal(response.body.data.case.hintLimit, fixture.hints.length);
      const publicJson = JSON.stringify(response.body.data.case);
      for (const privateValue of [
        'culpritId', 'solutionExplanation', 'supportingEvidenceIds', 'supportingClueIds',
        'suspectExplanations', 'hintBank',
      ]) assert.equal(publicJson.includes(privateValue), false, `Fallback response exposed ${privateValue}`);
      for (const item of [...response.body.data.case.clues, ...response.body.data.case.evidence, ...response.body.data.case.timeline]) {
        assert.equal('relatedSuspectIds' in item, false);
      }

      const sessionResponse = await request(app).post(`/api/v1/cases/${response.body.data.caseId}/sessions`).send({});
      const session = sessionResponse.body.data;
      const headers = { Authorization: `Bearer ${session.sessionToken}` };
      const discovered = await request(app)
        .post(`/api/v1/cases/${response.body.data.caseId}/clues/${response.body.data.case.clues[0].id}/discover`)
        .set(headers).send({ sessionId: session.sessionId });
      assert.equal(discovered.status, 200);
      const hint = await request(app).post(`/api/v1/cases/${response.body.data.caseId}/hints`)
        .set(headers).send({ sessionId: session.sessionId, requestId: 'fallback-hint-request-1' });
      assert.equal(hint.status, 200);
      assert.equal(JSON.stringify(hint.body).includes('culpritId'), false);

      const verdict = await request(app).post(`/api/v1/cases/${response.body.data.caseId}/accuse`)
        .set(headers).send({ sessionId: session.sessionId, suspectId: fixture.solution.culpritId });
      assert.equal(verdict.status, 200);
      assert.equal(verdict.body.data.result.correct, true);
      assert.equal(verdict.body.data.result.finalScore, baseScores[fixture.case.difficulty] - 5);
      assert.equal(verdict.body.data.result.culpritId, fixture.solution.culpritId);
      }
    }
  });

  it('does not use a fixture fallback for configuration, quota, or invalid-output errors', async () => {
    for (const failure of [
      new CaseGenerationError('GENERATION_NOT_CONFIGURED', 'Not configured.', 503),
      new CaseGenerationError('GENERATION_QUOTA_EXCEEDED', 'Quota exceeded.', 429),
      new CaseGenerationError('MALFORMED_MODEL_OUTPUT', 'Malformed output.', 502),
    ]) {
      const app = createApp({ generateCase: async () => { throw failure; } });
      const response = await request(app).post('/api/v1/cases').send(input);
      assert.equal(response.status, failure.status);
      assert.equal(response.body.error.code, failure.code);
      assert.equal(response.body.data, undefined);
    }
  });

  it('sends a fallback fixture through the normal case persistence path', async () => {
    let savedRecord;
    const store = {
      saveCaseRecord: async (record) => {
        savedRecord = record;
        return true;
      },
    };
    const app = createApp({
      generateCase: async () => { throw new CaseGenerationError('GENERATION_PROVIDER_UNAVAILABLE', 'Unavailable.', 502); },
      store,
    });
    const response = await request(app).post('/api/v1/cases').send(input);

    assert.equal(response.status, 201);
    assert.equal(response.body.data.persisted, true);
    assert.equal(savedRecord.case.id, response.body.data.caseId);
    assert.equal(savedRecord.case.source, 'development_fixture');
    assert.ok(savedRecord.solution.culpritId);
    assert.equal(savedRecord.hints.length, savedRecord.case.hintLimit);
    assert.equal(JSON.stringify(response.body).includes(savedRecord.solution.solutionExplanation), false);
  });

  it('distinguishes rejected credentials, unavailable models, quota exhaustion, and provider outages without exposing provider messages', async () => {
    const providerFailure = (status, providerStatus, reason) => Object.assign(
      new Error(JSON.stringify({ error: {
        code: status,
        message: 'Sensitive provider response with do-not-log-secret',
        status: providerStatus,
        details: reason ? [{ reason }] : [],
      } })),
      { status, name: 'ApiError' },
    );
    const cases = [
      [providerFailure(400, 'INVALID_ARGUMENT', 'API_KEY_INVALID'), 502, 'GENERATION_AUTH_FAILED', '400'],
      [providerFailure(404, 'NOT_FOUND', 'MODEL_NOT_FOUND'), 502, 'GENERATION_MODEL_UNAVAILABLE', '404'],
      [providerFailure(429, 'RESOURCE_EXHAUSTED', 'QUOTA_EXCEEDED'), 429, 'GENERATION_QUOTA_EXCEEDED', '429'],
      [providerFailure(503, 'UNAVAILABLE'), 201, 'GENERATION_PROVIDER_UNAVAILABLE', '503', true],
      [Object.assign(new TypeError('do-not-log-secret'), { cause: Object.assign(new Error('do-not-log-secret'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }) }), 502, 'GENERATION_TRANSPORT_ERROR', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'],
    ];

    for (const [failure, expectedStatus, expectedCode, diagnostic, isFallback = false] of cases) {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => warnings.push(args.join(' '));
      try {
        const generator = createGeminiCaseGenerator({
          getConfig: () => ({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' }),
          clientFactory: () => ({ models: { generateContent: async () => { throw failure; } } }),
        });
        const response = await request(createApp({ generateCase: generator })).post('/api/v1/cases').send(input);
        assert.equal(response.status, expectedStatus);
        if (isFallback) {
          assert.equal(response.body.data.generation.method, 'prebuilt_fixture_fallback');
          assert.equal(response.body.data.generation.reason, expectedCode);
        } else {
          assert.equal(response.body.error.code, expectedCode);
        }
        assert.equal(JSON.stringify(response.body).includes('do-not-log-secret'), false);
        assert.equal(warnings.join(' ').includes('do-not-log-secret'), false);
        assert.ok(warnings.join(' ').includes(diagnostic));
      } finally {
        console.warn = originalWarn;
      }
    }
  });
});
