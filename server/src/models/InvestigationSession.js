import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
const hintRequestSchema = new Schema({
  requestId: { type: String, required: true },
  hintId: { type: String, required: true },
  responseSnapshot: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false, strict: 'throw' });

const scoreBreakdownSchema = new Schema({
  basePoints: { type: Number, min: 0, default: 0 },
  cluePoints: { type: Number, min: 0, default: 0 },
  hintPenalty: { type: Number, min: 0, default: 0 },
}, { _id: false, strict: 'throw' });

const suspectExplanationSchema = new Schema({
  suspectId: { type: String, required: true },
  explanation: { type: String, required: true },
}, { _id: false, strict: 'throw' });

const resultSchema = new Schema({
  correct: { type: Boolean, required: true },
  selectedSuspectId: { type: String, required: true },
  culpritId: { type: String, required: true, select: false },
  solutionExplanation: { type: String, required: true, select: false },
  supportingEvidenceIds: { type: [String], required: true, select: false },
  supportingClueIds: { type: [String], required: true, select: false },
  suspectExplanations: { type: [suspectExplanationSchema], required: true, select: false },
  finalScore: { type: Number, min: 0, required: true },
  scoreBreakdown: { type: scoreBreakdownSchema, required: true },
}, { _id: false, strict: 'throw' });

const sessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  caseId: { type: String, required: true, index: true },
  sessionTokenHash: { type: String, required: true, unique: true, select: false },
  examinedEvidenceIds: { type: [String], default: [] },
  discoveredClueIds: {
    type: [String],
    default: [],
    validate: { validator: (ids) => new Set(ids).size === ids.length, message: 'Discovered clue IDs must be unique per session' },
  },
  viewedSuspectIds: { type: [String], default: [] },
  selectedSuspectId: { type: String, default: null },
  hintsUsed: { type: Number, min: 0, default: 0 },
  hintRequests: { type: [hintRequestSchema], default: [] },
  status: { type: String, enum: ['investigating', 'completed'], default: 'investigating' },
  result: { type: resultSchema, default: null },
  accusationSubmittedAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw', minimize: false });

sessionSchema.index({ caseId: 1, status: 1 });

export const InvestigationSession = models.InvestigationSession || model('InvestigationSession', sessionSchema, 'investigationSessions');
