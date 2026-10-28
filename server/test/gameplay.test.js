import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { mockCases } from '../src/fixtures/mockCases.js';

async function openSession(app, caseId) {
  const response = await request(app).post(`/api/v1/cases/${caseId}/sessions`).send({});
  assert.equal(response.status, 201);
  return { sessionId: response.body.data.sessionId, token: response.body.data.sessionToken };
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }

describe('mock case investigation gameplay', () => {
  it('supports clue discovery once per unique clue and rejects invalid or unauthorized access', async () => {
    const app = createApp();
    const { case: item, solution } = mockCases[0];
    const session = await openSession(app, item.id);
    const body = { sessionId: session.sessionId };
    const first = await request(app).post(`/api/v1/cases/${item.id}/clues/${item.clues[0].id}/discover`).set(auth(session.token)).send(body);
    const duplicate = await request(app).post(`/api/v1/cases/${item.id}/clues/${item.clues[0].id}/discover`).set(auth(session.token)).send(body);
    const invalid = await request(app).post(`/api/v1/cases/${item.id}/clues/nope/discover`).set(auth(session.token)).send(body);
    const unauthorized = await request(app).post(`/api/v1/cases/${item.id}/clues/${item.clues[1].id}/discover`).set(auth('x'.repeat(40))).send(body);
    assert.equal(first.status, 200);
    assert.equal(first.body.data.progress.discoveredClueCount, 1);
    assert.equal(duplicate.body.data.alreadyDiscovered, true);
    assert.equal(duplicate.body.data.progress.discoveredClueCount, 1);
    assert.equal(invalid.status, 404);
    assert.equal(unauthorized.status, 401);
    assert.equal(JSON.stringify(first.body).includes(solution.solutionExplanation), false);
    assert.equal('culpritId' in first.body.data, false);
    assert.equal('relatedSuspectIds' in first.body.data.clue, false);
    assert.deepEqual(first.body.data.clue.evidenceIds, item.clues[0].evidenceIds);
  });

  it('enforces each difficulty hint limit and idempotently replays the same hint request', async () => {
    for (const record of mockCases) {
      const { case: item, solution } = record;
      const app = createApp();
      const session = await openSession(app, item.id);
      const headers = auth(session.token);
      const requestHint = (requestId) => request(app).post(`/api/v1/cases/${item.id}/hints`).set(headers).send({ sessionId: session.sessionId, requestId });
      const first = await requestHint('request-first-0001');
      const replay = await requestHint('request-first-0001');
      assert.equal(first.status, 200);
      assert.equal(replay.body.data.replayed, true);
      assert.deepEqual(replay.body.data.hint, first.body.data.hint);
      assert.equal(replay.body.data.progress.hintsUsed, 1);
      for (let index = 1; index < item.hintLimit; index += 1) assert.equal((await requestHint(`request-extra-${index}-0000`)).status, 200);
      const exhausted = await requestHint('request-beyond-limit-0000');
      assert.equal(exhausted.status, 409);
      assert.equal(exhausted.body.error.code, 'HINT_LIMIT_REACHED');
      const finalState = await request(app).get(`/api/v1/cases/${item.id}/session?sessionId=${session.sessionId}`).set(headers);
      assert.equal(finalState.body.data.progress.hintsUsed, item.hintLimit);
      for (const hint of record.hints) {
        assert.equal(hint.text.includes(solution.culpritId), false);
        assert.equal(hint.text.includes(solution.solutionExplanation), false);
      }
    }
  });

  it('calculates correct and incorrect scores on the server for every difficulty', async () => {
    for (const record of mockCases) {
      const { case: item, solution } = record;
      const app = createApp();
      const correctSession = await openSession(app, item.id);
      const correctHeaders = auth(correctSession.token);
      for (const clue of item.clues) {
        await request(app).post(`/api/v1/cases/${item.id}/clues/${clue.id}/discover`).set(correctHeaders).send({ sessionId: correctSession.sessionId });
        if (clue === item.clues[0]) await request(app).post(`/api/v1/cases/${item.id}/clues/${clue.id}/discover`).set(correctHeaders).send({ sessionId: correctSession.sessionId });
      }
      for (let index = 0; index < item.hintLimit; index += 1) await request(app).post(`/api/v1/cases/${item.id}/hints`).set(correctHeaders).send({ sessionId: correctSession.sessionId, requestId: `correct-hint-${index}-0000` });
      const tampered = await request(app).post(`/api/v1/cases/${item.id}/accuse`).set(correctHeaders).send({ sessionId: correctSession.sessionId, suspectId: solution.culpritId, finalScore: 999999 });
      assert.equal(tampered.status, 400);
      const correct = await request(app).post(`/api/v1/cases/${item.id}/accuse`).set(correctHeaders).send({ sessionId: correctSession.sessionId, suspectId: solution.culpritId });
      const base = { easy: 100, medium: 150, hard: 200 }[item.difficulty];
      assert.equal(correct.status, 200);
      assert.equal(correct.body.data.result.finalScore, base + item.clues.length * 5 - item.hintLimit * 10);
      assert.deepEqual(correct.body.data.result.scoreBreakdown, { basePoints: base, cluePoints: item.clues.length * 5, hintPenalty: item.hintLimit * 10 });
      const repeated = await request(app).post(`/api/v1/cases/${item.id}/accuse`).set(correctHeaders).send({ sessionId: correctSession.sessionId, suspectId: item.suspects[0].id });
      assert.equal(repeated.status, 409);
      const before = await request(app).get(`/api/v1/cases/${item.id}/result?sessionId=${correctSession.sessionId}`).set(correctHeaders);
      assert.equal(before.status, 200);
      assert.equal(before.body.data.result.finalScore, correct.body.data.result.finalScore);

      const incorrectSession = await openSession(app, item.id);
      const incorrectHeaders = auth(incorrectSession.token);
      for (const clue of item.clues.slice(0, 3)) await request(app).post(`/api/v1/cases/${item.id}/clues/${clue.id}/discover`).set(incorrectHeaders).send({ sessionId: incorrectSession.sessionId });
      await request(app).post(`/api/v1/cases/${item.id}/hints`).set(incorrectHeaders).send({ sessionId: incorrectSession.sessionId, requestId: `incorrect-hint-${item.difficulty}` });
      const wrongSuspect = item.suspects.find(({ id }) => id !== solution.culpritId);
      const incorrect = await request(app).post(`/api/v1/cases/${item.id}/accuse`).set(incorrectHeaders).send({ sessionId: incorrectSession.sessionId, suspectId: wrongSuspect.id });
      assert.equal(incorrect.body.data.result.correct, false);
      assert.equal(incorrect.body.data.result.scoreBreakdown.basePoints, 0);
      assert.equal(incorrect.body.data.result.finalScore, 5);
    }
  });

  it('keeps private solution data unavailable until a valid accusation and rejects bad suspect IDs', async () => {
    const app = createApp();
    const record = mockCases[1];
    const session = await openSession(app, record.case.id);
    const headers = auth(session.token);
    const publicCase = await request(app).get(`/api/v1/cases/${record.case.id}`);
    const pendingResult = await request(app).get(`/api/v1/cases/${record.case.id}/result?sessionId=${session.sessionId}`).set(headers);
    const badSuspect = await request(app).post(`/api/v1/cases/${record.case.id}/accuse`).set(headers).send({ sessionId: session.sessionId, suspectId: 'not-a-suspect' });
    assert.equal(publicCase.status, 200);
    assert.equal(JSON.stringify(publicCase.body).includes(record.solution.solutionExplanation), false);
    assert.equal('culpritId' in publicCase.body.data.case, false);
    assert.equal(pendingResult.status, 409);
    assert.equal(badSuspect.status, 400);
  });
});
