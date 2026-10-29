import { Router } from 'express';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { findMockCase, mockCases } from '../fixtures/mockCases.js';
import { serializePublicCase, serializePublicCaseSummary, serializePublicClue } from '../serializers/publicCase.js';
import { generateGeminiCase, CaseGenerationError } from '../services/geminiCaseGenerator.js';
import { gameplayStore } from '../services/gameplayStore.js';
import { difficultyRules, difficultySchema } from '../validators/caseSchemas.js';

const caseRequestSchema = z.object({
  scenario: z.string().trim().min(10, 'Describe the premise in at least 10 characters.').max(3000),
  difficulty: difficultySchema,
  category: z.string().trim().min(1).max(80).default('any'),
}).strict();
const asyncRoute = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export function createCasesRouter({ generateCase = generateGeminiCase, store = gameplayStore } = {}) {
  const router = Router();
  // Development gameplay uses process memory so fixtures work without MongoDB.
  const sessionRequestSchema = z.object({ sessionId: z.string().min(1) }).strict();
  const hintRequestSchema = sessionRequestSchema.extend({ requestId: z.string().trim().min(8).max(120) }).strict();
  const accusationSchema = sessionRequestSchema.extend({ suspectId: z.string().min(1), reason: z.string().max(1000).optional() }).strict();

  async function getAuthorizedSession(request, caseId, sessionIdOverride) {
    const parsed = z.object({ sessionId: z.string().min(1) }).safeParse(sessionIdOverride ? { sessionId: sessionIdOverride } : request.body ?? {});
    const header = request.get('authorization') ?? '';
    const token = /^Bearer ([A-Za-z0-9_-]{32,})$/.exec(header)?.[1];
    if (!parsed.success || !token) return null;
    const actual = Buffer.from(createHash('sha256').update(token).digest('hex'));
    const tokenHash = actual.toString();
    const session = await store.findSession(parsed.data.sessionId, caseId, tokenHash);
    if (!session) return null;
    const expectedHash = session.sessionTokenHash;
    if (!expectedHash) return null;
    const expected = Buffer.from(expectedHash);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return session;
  }

  function progressFor(session, caseRecord) {
    const discoveredClueIds = Array.isArray(session.discoveredClueIds)
      ? session.discoveredClueIds
      : [...session.discoveredClueIds];
    const hintsUsed = session.hintsUsed;
    return {
      discoveredClueIds: [...discoveredClueIds],
      discoveredClueCount: discoveredClueIds.length,
      hintsUsed,
      hintsRemaining: caseRecord.case.hintLimit - hintsUsed,
      status: session.result ? 'completed' : 'investigating',
      result: session.result ?? undefined,
    };
  }

function notFound(response, message = 'The requested mock case was not found.') {
  return response.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message } });
}

router.post('/', async (request, response) => {
  const parsed = caseRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Provide a valid premise and difficulty.' },
    });
  }

  try {
    let generated;
    let generation = { method: 'gemini' };
    try {
      generated = await generateCase(parsed.data);
    } catch (error) {
      const fallbackEligible = error instanceof CaseGenerationError && [
        'GENERATION_PROVIDER_UNAVAILABLE',
        'GENERATION_PROVIDER_DEADLINE',
        'GENERATION_CLIENT_TIMEOUT',
      ].includes(error.code);
      if (!fallbackEligible) throw error;

      const requestedCategory = parsed.data.category?.toLowerCase();

      generated = mockCases.find(({ case: fixtureCase }) =>
        fixtureCase.difficulty === parsed.data.difficulty &&
        (
          !requestedCategory ||
          requestedCategory === 'any' ||
          fixtureCase.category === requestedCategory
        )
      );

      if (!generated && requestedCategory && requestedCategory !== 'any') {
        generated = mockCases.find(({ case: fixtureCase }) =>
          fixtureCase.difficulty === parsed.data.difficulty
        );
      }
      
      if (!generated) throw error;
      generation = { method: 'prebuilt_fixture_fallback', reason: error.code };
    }
    const persisted = await store.saveCaseRecord(generated);
    return response.status(201).json({
      success: true,
      data: {
        caseId: generated.case.id,
        status: 'ready',
        persisted,
        generation,
        case: serializePublicCase(generated),
      },
    });
  } catch (error) {
    if (error instanceof CaseGenerationError) {
      return response.status(error.status).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    console.error('Case generation failed with an unexpected internal error.');
    return response.status(500).json({
      success: false,
      error: { code: 'GENERATION_FAILED', message: 'The case could not be generated. Please try again.' },
    });
  }
});

router.get('/', asyncRoute(async (_request, response) => {
  const records = await store.listCaseRecords(mockCases);
  return response.json({
    success: true,
    data: { cases: records.map(serializePublicCaseSummary) },
  });
}));

router.get('/:caseId', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  return response.json({ success: true, data: { case: serializePublicCase(record) } });
}));

router.get('/:caseId/suspects/:suspectId', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const suspect = record.case.suspects.find(({ id }) => id === request.params.suspectId);
  if (!suspect) return notFound(response, 'The requested suspect is not part of this case.');
  return response.json({
    success: true,
    data: { suspect: serializePublicCase(record).suspects.find(({ id }) => id === suspect.id) },
  });
}));

router.get('/:caseId/evidence', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const typeSchema = z.enum(['chat', 'image', 'cctv', 'witness', 'document', 'timeline']);
  const parsedType = request.query.type === undefined ? undefined : typeSchema.safeParse(request.query.type);
  if (parsedType && !parsedType.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Choose a supported evidence type.' },
    });
  }
  const evidence = serializePublicCase(record).evidence;
  return response.json({
    success: true,
    data: { evidence: parsedType ? evidence.filter((item) => item.type === parsedType.data) : evidence },
  });
}));

router.get('/:caseId/evidence/:evidenceId', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const evidence = serializePublicCase(record).evidence.find(({ id }) => id === request.params.evidenceId);
  if (!evidence) return notFound(response, 'The requested evidence item is not part of this case.');
  return response.json({ success: true, data: { evidence } });
}));

router.post('/:caseId/sessions', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const sessionId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const session = {
    sessionId,
    caseId: record.case.id,
    sessionTokenHash: createHash('sha256').update(token).digest('hex'),
    discoveredClueIds: [],
    hintsUsed: 0,
    hintRequests: [],
    status: 'investigating',
  };
  const createdSession = await store.createSession(session);
  return response.status(201).json({
    success: true,
    data: { sessionId, sessionToken: token, progress: progressFor(createdSession, record) },
  });
}));

router.get('/:caseId/session', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const session = await getAuthorizedSession(request, record.case.id, request.query.sessionId);
  if (!session) return response.status(401).json({ success: false, error: { code: 'SESSION_UNAUTHORIZED', message: 'A valid investigation session is required.' } });
  return response.json({ success: true, data: { progress: progressFor(session, record), result: session.result ?? undefined } });
}));

router.post('/:caseId/clues/:clueId/discover', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const session = await getAuthorizedSession(request, record.case.id);
  if (!session) return response.status(401).json({ success: false, error: { code: 'SESSION_UNAUTHORIZED', message: 'A valid investigation session is required.' } });
  const clue = record.case.clues.find(({ id }) => id === request.params.clueId);
  if (!clue) return response.status(404).json({ success: false, error: { code: 'CLUE_NOT_FOUND', message: 'The clue is not part of this case.' } });
  if (session.result) return response.status(409).json({ success: false, error: { code: 'SESSION_COMPLETED', message: 'This investigation is already complete.' } });
  const discovery = await store.discover(session, clue.id);
  if (!discovery.session) return response.status(409).json({ success: false, error: { code: 'SESSION_COMPLETED', message: 'This investigation is already complete.' } });
  return response.json({ success: true, data: { clue: serializePublicClue(clue), alreadyDiscovered: discovery.alreadyDiscovered, progress: progressFor(discovery.session, record) } });
}));

router.post('/:caseId/hints', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const parsed = hintRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide a valid session ID and hint request ID.' } });
  const session = await getAuthorizedSession(request, record.case.id);
  if (!session) return response.status(401).json({ success: false, error: { code: 'SESSION_UNAUTHORIZED', message: 'A valid investigation session is required.' } });
  if (session.result) return response.status(409).json({ success: false, error: { code: 'SESSION_COMPLETED', message: 'This investigation is already complete.' } });
  const hint = record.hints[session.hintsUsed];
  const requested = await store.requestHint(session, parsed.data.requestId, hint, record.case.hintLimit);
  if (requested.exhausted) {
    const completed = requested.session?.status === 'completed' || session.status === 'completed';
    return response.status(409).json({ success: false, error: { code: completed ? 'SESSION_COMPLETED' : 'HINT_LIMIT_REACHED', message: completed ? 'This investigation is already complete.' : 'No hints remain for this difficulty.' } });
  }
  return response.json({ success: true, data: { hint: requested.hint, replayed: requested.replayed, progress: progressFor(requested.session, record) } });
}));

router.post('/:caseId/accuse', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const parsed = accusationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide a valid session ID and suspect ID.' } });
  const session = await getAuthorizedSession(request, record.case.id);
  if (!session) return response.status(401).json({ success: false, error: { code: 'SESSION_UNAUTHORIZED', message: 'A valid investigation session is required.' } });
  if (session.status === 'completed' || session.result) return response.status(409).json({ success: false, error: { code: 'ACCUSATION_ALREADY_SUBMITTED', message: 'An accusation has already been submitted for this session.' } });
  if (!record.case.suspects.some(({ id }) => id === parsed.data.suspectId)) return response.status(400).json({ success: false, error: { code: 'INVALID_SUSPECT', message: 'Choose a suspect from this case.' } });
  const correct = parsed.data.suspectId === record.solution.culpritId;
  const basePoints = correct ? difficultyRules[record.case.difficulty].baseScore : 0;
  const discoveredCount = Array.isArray(session.discoveredClueIds) ? session.discoveredClueIds.length : session.discoveredClueIds.size;
  const cluePoints = discoveredCount * 5;
  const hintPenalty = session.hintsUsed * 10;
  const result = {
    correct,
    selectedSuspectId: parsed.data.suspectId,
    culpritId: record.solution.culpritId,
    solutionExplanation: record.solution.solutionExplanation,
    supportingEvidenceIds: [...record.solution.supportingEvidenceIds],
    supportingClueIds: [...record.solution.supportingClueIds],
    suspectExplanations: record.solution.suspectExplanations.map((item) => ({ ...item })),
    finalScore: Math.max(0, basePoints + cluePoints - hintPenalty),
    scoreBreakdown: { basePoints, cluePoints, hintPenalty },
  };
  const completedSession = await store.completeAccusation(session, result);
  if (!completedSession) {
    const latest = await store.findSession(session.sessionId, session.caseId, session.sessionTokenHash);
    const completed = latest?.status === 'completed';
    return response.status(409).json({
      success: false,
      error: {
        code: completed ? 'ACCUSATION_ALREADY_SUBMITTED' : 'SESSION_CHANGED',
        message: completed ? 'An accusation has already been submitted for this session.' : 'Investigation progress changed. Review the updated case state and submit again.',
      },
    });
  }
  return response.json({ success: true, data: { result } });
}));

router.get('/:caseId/result', asyncRoute(async (request, response) => {
  const record = await store.getCaseRecord(request.params.caseId, findMockCase(request.params.caseId));
  if (!record) return notFound(response);
  const session = await getAuthorizedSession(request, record.case.id, request.query.sessionId);
  if (!session) return response.status(401).json({ success: false, error: { code: 'SESSION_UNAUTHORIZED', message: 'A valid investigation session is required.' } });
  if (session.status !== 'completed' || !session.result) return response.status(409).json({ success: false, error: { code: 'RESULT_NOT_READY', message: 'Submit an accusation to see the result.' } });
  return response.json({ success: true, data: { result: session.result, progress: progressFor(session, record) } });
}));

  return router;
}

export const casesRouter = createCasesRouter();
