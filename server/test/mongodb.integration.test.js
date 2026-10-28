import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import '../src/config/env.js';
import { configureDevelopmentMongoDns } from '../src/config/database.js';
import { Case } from '../src/models/Case.js';
import { CaseSolution } from '../src/models/CaseSolution.js';
import { InvestigationSession } from '../src/models/InvestigationSession.js';
import { mockCases } from '../src/fixtures/mockCases.js';
import { serializePublicCase } from '../src/serializers/publicCase.js';
import { createGameplayStore } from '../src/services/gameplayStore.js';

const integrationEnabled = process.env.MONGODB_INTEGRATION_TEST === '1';

function requireDisposableTestUri(value) {
  assert.ok(
    value?.trim(),
    'MONGODB_TEST_URI is required when MONGODB_INTEGRATION_TEST=1. Configure a separate disposable test database; the regular MONGODB_URI is never used by this test.',
  );

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('MONGODB_TEST_URI must be a valid MongoDB connection URI for a disposable test database.');
  }
  assert.ok(['mongodb:', 'mongodb+srv:'].includes(parsed.protocol), 'MONGODB_TEST_URI must use mongodb:// or mongodb+srv://.');

  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] ?? '');
  } catch {
    throw new Error('MONGODB_TEST_URI must include a valid test database name in its path.');
  }
  assert.ok(databaseName, 'MONGODB_TEST_URI must include a database name in its path.');
  assert.match(
    databaseName,
    /(^|[-_.])(test|testing|integration|disposable)([-_.]|$)/i,
    'Refusing MongoDB integration test: the MONGODB_TEST_URI database name must clearly identify a disposable test database (for example, ai-mystery-room-test).',
  );
  return value.trim();
}

describe('MongoDB integration test safety', () => {
  it('requires the dedicated MONGODB_TEST_URI when the integration test is enabled', () => {
    assert.throws(() => requireDisposableTestUri(undefined), /MONGODB_TEST_URI is required/);
  });

  it('rejects database names that do not clearly identify a disposable test database', () => {
    assert.throws(
      () => requireDisposableTestUri('mongodb://localhost/ai-mystery-room'),
      /database name must clearly identify a disposable test database/,
    );
    assert.equal(requireDisposableTestUri('mongodb://localhost/ai-mystery-room-test'), 'mongodb://localhost/ai-mystery-room-test');
  });
});

describe('MongoDB gameplay persistence integration', () => {
  it('recovers a completed investigation after disconnecting and creating a fresh store', {
    skip: !integrationEnabled,
  }, async () => {
    const testUri = requireDisposableTestUri(process.env.MONGODB_TEST_URI);
    const suffix = randomUUID();
    const fixture = structuredClone(mockCases[0]);
    fixture.case.id = `integration-${suffix}`;
    const sessionId = `integration-session-${suffix}`;
    const sessionTokenHash = `hash-${suffix}`;
    let connectionAttempted = false;

    try {
      connectionAttempted = true;
      configureDevelopmentMongoDns();
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
      const store = createGameplayStore();
      assert.equal(await store.saveCaseRecord(fixture), true);
      const publicRecord = await store.findPersistedCase(fixture.case.id);
      assert.equal(publicRecord.case.id, fixture.case.id);
      assert.equal(JSON.stringify(serializePublicCase(publicRecord)).includes(fixture.solution.solutionExplanation), false);
      assert.equal((await CaseSolution.findOne({ caseId: fixture.case.id }).lean()).culpritId, undefined);

      let session = await store.createSession({ sessionId, sessionTokenHash, caseId: fixture.case.id, status: 'investigating' });
      const discovery = await store.discover(session, fixture.case.clues[0].id);
      assert.equal(discovery.alreadyDiscovered, false);
      assert.equal((await store.findSession(sessionId, fixture.case.id, sessionTokenHash)).discoveredClueIds.length, 1);
      session = await store.findSession(sessionId, fixture.case.id, sessionTokenHash);
      const hint = fixture.hints[0];
      const served = await store.requestHint(session, 'integration-request-1', hint, fixture.case.hintLimit);
      assert.equal(served.session.hintsUsed, 1);
      const replay = await store.requestHint(served.session, 'integration-request-1', hint, fixture.case.hintLimit);
      assert.equal(replay.replayed, true);
      assert.equal(replay.session.hintsUsed, 1);

      const persistedSession = await store.findSession(sessionId, fixture.case.id, sessionTokenHash);
      const completed = await store.completeAccusation(persistedSession, {
        correct: true,
        selectedSuspectId: fixture.solution.culpritId,
        culpritId: fixture.solution.culpritId,
        solutionExplanation: fixture.solution.solutionExplanation,
        supportingEvidenceIds: fixture.solution.supportingEvidenceIds,
        supportingClueIds: fixture.solution.supportingClueIds,
        suspectExplanations: fixture.solution.suspectExplanations,
        finalScore: 95,
        scoreBreakdown: { basePoints: 100, cluePoints: 5, hintPenalty: 10 },
      });
      assert.equal(completed.status, 'completed');

      await mongoose.disconnect();
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 });
      const restartedStore = createGameplayStore();
      const recovered = await restartedStore.findSession(sessionId, fixture.case.id, sessionTokenHash);
      assert.ok(recovered, 'The completed investigation session should survive a database reconnect.');
      assert.equal(recovered.status, 'completed');
      assert.deepEqual(recovered.discoveredClueIds, [fixture.case.clues[0].id]);
      assert.equal(recovered.selectedSuspectId, fixture.solution.culpritId);
      assert.equal(recovered.result.correct, true);
      assert.equal(recovered.result.culpritId, fixture.solution.culpritId);
      assert.equal(recovered.result.finalScore, 95);
      assert.deepEqual(recovered.result.scoreBreakdown, { basePoints: 100, cluePoints: 5, hintPenalty: 10 });
      assert.equal(recovered.result.solutionExplanation, fixture.solution.solutionExplanation);
    } finally {
      // If a transient disconnect interrupted the restart check, reconnect only
      // to the already validated test URI so this test's unique records can be removed.
      if (connectionAttempted && mongoose.connection.readyState !== 1) {
        await mongoose.connect(testUri, { serverSelectionTimeoutMS: 5000 }).catch(() => {});
      }
      if (mongoose.connection.readyState === 1) {
        await Promise.all([
          Case.deleteOne({ caseId: fixture.case.id }),
          CaseSolution.deleteOne({ caseId: fixture.case.id }),
          InvestigationSession.deleteOne({ sessionId }),
        ]);
      }
      await mongoose.disconnect();
    }
  });
});
