import mongoose from 'mongoose';
import { Case } from '../models/Case.js';
import { CaseSolution } from '../models/CaseSolution.js';
import { InvestigationSession } from '../models/InvestigationSession.js';
import { caseWithSolutionSchema } from '../validators/caseSchemas.js';

const privateSolutionFields = [
  '+culpritId', '+motive', '+method', '+opportunity', '+solutionExplanation',
  '+supportingEvidenceIds', '+supportingClueIds', '+suspectExplanations', '+hintBank',
].join(' ');
const privateResultFields = [
  '+result.culpritId', '+result.solutionExplanation', '+result.supportingEvidenceIds',
  '+result.supportingClueIds', '+result.suspectExplanations', '+sessionTokenHash',
].join(' ');

function withoutMongoMetadata(document) {
  const { _id, __v, caseId, ...data } = document;
  return { ...data, id: caseId };
}

function normalizeCaseDates(caseData) {
  const toIso = (value) => value instanceof Date ? value.toISOString() : value;
  caseData.createdAt = toIso(caseData.createdAt);
  caseData.incident.occurredAt = toIso(caseData.incident.occurredAt);
  caseData.evidence = caseData.evidence.map((item) => ({ ...item, occurredAt: toIso(item.occurredAt) }));
  caseData.timeline = caseData.timeline.map((event) => ({ ...event, occurredAt: toIso(event.occurredAt) }));
  return caseData;
}

export function createGameplayStore({
  models = { Case, CaseSolution, InvestigationSession },
  isConnected = () => mongoose.connection.readyState === 1,
  sessions = new Map(),
} = {}) {
  const { Case: CaseModel, CaseSolution: SolutionModel, InvestigationSession: SessionModel } = models;

  async function saveCaseRecord(record) {
    if (!isConnected()) return false;
    const { id, ...caseData } = record.case;
    await CaseModel.updateOne({ caseId: id }, { $setOnInsert: { ...caseData, caseId: id } }, { upsert: true, runValidators: true });
    await SolutionModel.updateOne({ caseId: id }, { $setOnInsert: { caseId: id, ...record.solution, hintBank: record.hints } }, { upsert: true, runValidators: true });
    return true;
  }

  async function findPersistedCase(caseId) {
    if (!isConnected()) return null;
    const [caseDocument, solutionDocument] = await Promise.all([
      CaseModel.findOne({ caseId }).lean(),
      SolutionModel.findOne({ caseId }).select(privateSolutionFields).lean(),
    ]);
    if (!caseDocument || !solutionDocument) return null;
    const caseData = normalizeCaseDates(withoutMongoMetadata(caseDocument));
    const { _id, __v, caseId: ignoredCaseId, hintBank, ...solution } = solutionDocument;
    return caseWithSolutionSchema.parse({ case: caseData, solution, hints: hintBank });
  }

  async function getCaseRecord(caseId, fixture) {
    if (!isConnected()) return fixture ?? null;
    let persisted = await findPersistedCase(caseId);
    if (!persisted && fixture) {
      await saveCaseRecord(fixture);
      persisted = await findPersistedCase(caseId);
    }
    return persisted;
  }

  async function listCaseRecords(fixtures) {
    if (!isConnected()) return fixtures;
    for (const fixture of fixtures) await saveCaseRecord(fixture);
    const records = await CaseModel.find({ status: 'ready' }).select('caseId title summary category difficulty suspectCount clueCount hintLimit status source createdAt').sort({ createdAt: 1 }).lean();
    const loaded = await Promise.all(records.map(({ caseId }) => findPersistedCase(caseId)));
    return loaded.filter(Boolean);
  }

  async function createSession(data) {
    if (!isConnected()) {
      sessions.set(data.sessionId, { ...data, discoveredClueIds: new Set(), hintsUsed: 0, hintRequests: new Map(), result: null });
      return sessions.get(data.sessionId);
    }
    return SessionModel.create(data);
  }

  async function findSession(sessionId, caseId, tokenHash) {
    if (!isConnected()) {
      const session = sessions.get(sessionId);
      if (!session || session.caseId !== caseId || session.sessionTokenHash !== tokenHash) return null;
      return session;
    }
    return SessionModel.findOne({ sessionId, caseId, sessionTokenHash: tokenHash }).select(privateResultFields).lean();
  }

  async function discover(session, clueId) {
    if (!isConnected()) {
      const alreadyDiscovered = session.discoveredClueIds.has(clueId);
      session.discoveredClueIds.add(clueId);
      return { alreadyDiscovered, session };
    }
    const before = session.discoveredClueIds.includes(clueId);
    const updated = await SessionModel.findOneAndUpdate(
      { sessionId: session.sessionId, caseId: session.caseId, sessionTokenHash: session.sessionTokenHash, status: 'investigating' },
      { $addToSet: { discoveredClueIds: clueId } },
      { new: true },
    ).select(privateResultFields).lean();
    return { alreadyDiscovered: before, session: updated };
  }

  async function requestHint(session, requestId, hint, limit) {
    if (!isConnected()) {
      const prior = session.hintRequests.get(requestId);
      if (prior) return { replayed: true, hint: prior, session };
      if (session.hintsUsed >= limit || session.result) return { exhausted: true, session };
      session.hintsUsed += 1;
      session.hintRequests.set(requestId, hint);
      return { replayed: false, hint, session };
    }
    const prior = session.hintRequests.find((entry) => entry.requestId === requestId);
    if (prior) return { replayed: true, hint: JSON.parse(prior.responseSnapshot), session };
    const updated = await SessionModel.findOneAndUpdate(
      { sessionId: session.sessionId, caseId: session.caseId, sessionTokenHash: session.sessionTokenHash, status: 'investigating', hintsUsed: { $lt: limit }, 'hintRequests.requestId': { $ne: requestId } },
      { $inc: { hintsUsed: 1 }, $push: { hintRequests: { requestId, hintId: hint.id, responseSnapshot: JSON.stringify(hint) } } },
      { new: true },
    ).select(privateResultFields).lean();
    if (updated) return { replayed: false, hint, session: updated };
    const current = await findSession(session.sessionId, session.caseId, session.sessionTokenHash);
    const duplicate = current?.hintRequests.find((entry) => entry.requestId === requestId);
    if (duplicate) return { replayed: true, hint: JSON.parse(duplicate.responseSnapshot), session: current };
    return { exhausted: true, session: current };
  }

  async function completeAccusation(session, result) {
    if (!isConnected()) {
      if (session.result) return null;
      session.result = result;
      session.selectedSuspectId = result.selectedSuspectId;
      session.status = 'completed';
      session.accusationSubmittedAt = new Date();
      return session;
    }
    return SessionModel.findOneAndUpdate(
      {
        sessionId: session.sessionId,
        caseId: session.caseId,
        sessionTokenHash: session.sessionTokenHash,
        status: 'investigating',
        hintsUsed: session.hintsUsed,
        discoveredClueIds: { $all: session.discoveredClueIds, $size: session.discoveredClueIds.length },
      },
      { $set: { selectedSuspectId: result.selectedSuspectId, status: 'completed', result, accusationSubmittedAt: new Date() } },
      { new: true },
    ).select(privateResultFields).lean();
  }

  return { isConnected, saveCaseRecord, findPersistedCase, getCaseRecord, listCaseRecords, createSession, findSession, discover, requestHint, completeAccusation };
}

export const gameplayStore = createGameplayStore();
