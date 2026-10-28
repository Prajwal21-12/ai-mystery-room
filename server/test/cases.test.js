import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { findMockCase, mockCases } from '../src/fixtures/mockCases.js';
import { Case } from '../src/models/Case.js';
import { CaseSolution } from '../src/models/CaseSolution.js';
import { InvestigationSession } from '../src/models/InvestigationSession.js';
import { MediaAsset } from '../src/models/MediaAsset.js';
import { serializePublicCase } from '../src/serializers/publicCase.js';
import { caseWithSolutionSchema, difficultyRules, evidenceSchema, hintSchema, suspectSchema } from '../src/validators/caseSchemas.js';

describe('Phase 2 mock case contracts', () => {
  it('contains the required deterministic counts at every difficulty', () => {
    assert.deepEqual(mockCases.map(({ case: item }) => ({
      difficulty: item.difficulty,
      suspects: item.suspects.length,
      clues: item.clues.length,
      hints: item.hintLimit,
      source: item.source,
    })), [
      { difficulty: 'easy', suspects: 3, clues: 5, hints: 2, source: 'development_fixture' },
      { difficulty: 'medium', suspects: 4, clues: 7, hints: 3, source: 'development_fixture' },
      { difficulty: 'hard', suspects: 5, clues: 9, hints: 3, source: 'development_fixture' },
    ]);
    assert.deepEqual(difficultyRules.easy, { suspectCount: 3, clueCount: 5, hintLimit: 2, baseScore: 100 });
    assert.deepEqual(difficultyRules.medium, { suspectCount: 4, clueCount: 7, hintLimit: 3, baseScore: 150 });
    assert.deepEqual(difficultyRules.hard, { suspectCount: 5, clueCount: 9, hintLimit: 3, baseScore: 200 });
  });

  it('rejects invalid suspects, evidence, hints, case counts, and broken references', () => {
    assert.equal(suspectSchema.safeParse({ id: '', name: '', role: '', biography: '', publicMotive: '', alibi: '', personality: '' }).success, false);
    assert.equal(evidenceSchema.safeParse({ id: 'bad', type: 'cctv', title: 'Camera', description: 'Clip', source: 'test', content: {}, mediaStatus: 'unknown' }).success, false);
    assert.equal(hintSchema.safeParse({ id: 'h1', order: 0, text: '' }).success, false);

    const valid = findMockCase('fixture-easy-last-bell');
    const wrongCount = structuredClone(valid);
    wrongCount.case.suspects.pop();
    assert.equal(caseWithSolutionSchema.safeParse(wrongCount).success, false);

    const brokenReference = structuredClone(valid);
    brokenReference.case.clues[0].evidenceIds = ['missing-evidence'];
    assert.equal(caseWithSolutionSchema.safeParse(brokenReference).success, false);
  });

  it('validates all fixture evidence and canonical-solution references', () => {
    for (const record of mockCases) {
      const result = caseWithSolutionSchema.safeParse(record);
      assert.equal(result.success, true, result.success ? '' : JSON.stringify(result.error.issues));

      const suspectIds = new Set(record.case.suspects.map(({ id }) => id));
      const evidenceIds = new Set(record.case.evidence.map(({ id }) => id));
      const clueIds = new Set(record.case.clues.map(({ id }) => id));
      for (const item of record.case.evidence) {
        for (const suspectId of item.relatedSuspectIds) assert.equal(suspectIds.has(suspectId), true);
      }
      for (const item of record.case.clues) {
        for (const evidenceId of item.evidenceIds) assert.equal(evidenceIds.has(evidenceId), true);
      }
      for (const event of record.case.timeline) {
        for (const evidenceId of event.evidenceIds) assert.equal(evidenceIds.has(evidenceId), true);
      }
      for (const evidenceId of record.solution.supportingEvidenceIds) assert.equal(evidenceIds.has(evidenceId), true);
      for (const clueId of record.solution.supportingClueIds) assert.equal(clueIds.has(clueId), true);
    }
  });

  it('registers strict Mongoose models for all required collections', () => {
    assert.equal(Case.collection.collectionName, 'cases');
    assert.equal(CaseSolution.collection.collectionName, 'caseSolutions');
    assert.equal(InvestigationSession.collection.collectionName, 'investigationSessions');
    assert.equal(MediaAsset.collection.collectionName, 'mediaAssets');
    assert.equal(Case.schema.options.strict, 'throw');
    assert.equal(CaseSolution.schema.options.strict, 'throw');
    assert.equal(CaseSolution.schema.path('culpritId').options.select, false);
    assert.equal(CaseSolution.schema.path('hintBank').options.select, false);
    assert.equal(InvestigationSession.schema.path('sessionId').options.unique, true);
    assert.equal(InvestigationSession.schema.path('result.culpritId').options.select, false);
    assert.equal(InvestigationSession.schema.path('result.solutionExplanation').options.select, false);
  });

  it('enforces difficulty-specific suspect and clue counts in the Mongoose case model', async () => {
    const fixture = findMockCase('fixture-easy-last-bell').case;
    const { id, ...caseFields } = fixture;
    const validDocument = new Case({ ...caseFields, caseId: id });
    await assert.doesNotReject(validDocument.validate());

    const invalidDocument = new Case({
      ...caseFields,
      caseId: `${id}-invalid`,
      suspects: caseFields.suspects.slice(0, 2),
      suspectCount: 2,
    });
    await assert.rejects(invalidDocument.validate());
  });
});

describe('Mock case read API', () => {
  it('lists only explicitly identified development fixtures', async () => {
    const response = await request(app).get('/api/v1/cases');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.cases.map(({ difficulty, isDevelopmentFixture }) => [difficulty, isDevelopmentFixture]), [
      ['easy', true], ['medium', true], ['hard', true],
    ]);
  });

  it('keeps every fixture difficulty free of direct culprit fields and suspect-relationship leaks', async () => {
    for (const fixture of mockCases) {
      const response = await request(app).get(`/api/v1/cases/${fixture.case.id}`);
      assert.equal(response.status, 200);
      const publicCase = response.body.data.case;
      assert.equal(publicCase.isDevelopmentFixture, true);
      assert.equal(publicCase.source, 'development_fixture');
      assert.equal(publicCase.suspects.length, fixture.case.suspects.length);
      assert.equal(publicCase.clues.length, fixture.case.clues.length);
      assert.equal('culpritId' in publicCase, false);
      assert.equal('solution' in publicCase, false);
      assert.equal('hints' in publicCase, false);

      const serialized = JSON.stringify(publicCase);
      for (const privateField of ['culpritId', 'solutionExplanation', 'supportingEvidenceIds', 'supportingClueIds', 'suspectExplanations', 'hintBank', 'relatedSuspectIds']) {
        assert.equal(serialized.includes(privateField), false, `${fixture.case.difficulty} response exposed ${privateField}`);
      }
      assert.equal(serialized.includes(fixture.solution.solutionExplanation), false);
      // The internal culprit links remain available to the server, but never in public relationship arrays.
      for (const item of [...publicCase.clues, ...publicCase.evidence, ...publicCase.timeline]) {
        assert.equal('relatedSuspectIds' in item, false);
      }
    }
  });

  it('drops unexpected private fields at both case and nested evidence levels', () => {
    const poisoned = structuredClone(findMockCase('fixture-easy-last-bell'));
    poisoned.case.canonicalSolution = { culpritId: 'secret', reasoning: 'private' };
    poisoned.case.evidence[0].content.canonicalSolution = { culpritId: 'secret', reasoning: 'private' };
    const serialized = JSON.stringify(serializePublicCase(poisoned));

    assert.equal(serialized.includes('canonicalSolution'), false);
    assert.equal(serialized.includes('secret'), false);
    assert.equal(serialized.includes('reasoning'), false);
  });

  it('returns public suspect and evidence detail and filters by evidence type', async () => {
    const caseId = 'fixture-medium-glass-at-dawn';
    const suspect = await request(app).get(`/api/v1/cases/${caseId}/suspects/medium_suspect_ben`);
    const evidence = await request(app).get(`/api/v1/cases/${caseId}/evidence/medium_evidence_cctv`);
    const chatOnly = await request(app).get(`/api/v1/cases/${caseId}/evidence?type=chat`);

    assert.equal(suspect.status, 200);
    assert.equal(suspect.body.data.suspect.name, 'Bennett Shaw');
    assert.equal(evidence.status, 200);
    assert.equal(evidence.body.data.evidence.mediaStatus, 'storyboard');
    assert.equal(evidence.body.data.evidence.content.videoUrl, null);
    assert.equal(chatOnly.status, 200);
    assert.deepEqual(chatOnly.body.data.evidence.map(({ type }) => type), ['chat']);
  });

  it('returns documented not-found and validation errors for invalid public resource paths', async () => {
    const missingCase = await request(app).get('/api/v1/cases/not-a-fixture');
    const missingSuspect = await request(app).get('/api/v1/cases/fixture-easy-last-bell/suspects/not-a-suspect');
    const invalidType = await request(app).get('/api/v1/cases/fixture-easy-last-bell/evidence?type=secret');

    assert.equal(missingCase.status, 404);
    assert.equal(missingSuspect.status, 404);
    assert.equal(invalidType.status, 400);
  });
});
