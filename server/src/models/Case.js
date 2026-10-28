import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
const embeddedOptions = { _id: false, id: false, strict: 'throw' };
const difficultyCounts = {
  easy: { suspects: 3, clues: 5, hints: 2 },
  medium: { suspects: 4, clues: 7, hints: 3 },
  hard: { suspects: 5, clues: 9, hints: 3 },
};

const suspectSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, min: 1 },
  role: { type: String, required: true, trim: true },
  biography: { type: String, required: true, trim: true },
  publicMotive: { type: String, required: true, trim: true },
  alibi: { type: String, required: true, trim: true },
  personality: { type: String, required: true, trim: true },
  portraitUrl: { type: String, default: null },
}, embeddedOptions);

const clueSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  evidenceIds: { type: [String], required: true },
  relatedSuspectIds: { type: [String], default: [] },
}, embeddedOptions);

const evidenceSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['chat', 'image', 'cctv', 'witness', 'document', 'timeline'], required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  occurredAt: { type: Date },
  relatedSuspectIds: { type: [String], default: [] },
  source: { type: String, required: true },
  mediaStatus: { type: String, enum: ['not_applicable', 'development_placeholder', 'storyboard', 'pending', 'ready', 'failed'] },
  assetUrl: { type: String, default: null },
  content: { type: Schema.Types.Mixed, required: true, default: {} },
}, embeddedOptions);

const timelineEventSchema = new Schema({
  id: { type: String, required: true },
  occurredAt: { type: Date, required: true },
  description: { type: String, required: true, trim: true },
  evidenceIds: { type: [String], required: true },
  relatedSuspectIds: { type: [String], default: [] },
}, embeddedOptions);

const incidentSchema = new Schema({
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  occurredAt: { type: Date, required: true },
}, embeddedOptions);

const caseSchema = new Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  originalScenario: { type: String, required: true, maxlength: 3000 },
  summary: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  suspectCount: { type: Number, required: true, min: 3, max: 5 },
  clueCount: { type: Number, required: true, min: 5, max: 9 },
  hintLimit: { type: Number, required: true, min: 2, max: 3 },
  incident: { type: incidentSchema, required: true },
  suspects: { type: [suspectSchema], required: true },
  clues: { type: [clueSchema], required: true },
  evidence: { type: [evidenceSchema], required: true },
  timeline: { type: [timelineEventSchema], required: true },
  status: { type: String, enum: ['generating', 'validating', 'preparing_media', 'ready', 'failed'], default: 'ready', required: true },
  source: { type: String, enum: ['development_fixture', 'generated'], required: true },
  generationMetadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, strict: 'throw', minimize: false });

caseSchema.index({ difficulty: 1, status: 1 });
caseSchema.pre('validate', function validateDifficultyCounts() {
  const expected = difficultyCounts[this.difficulty];
  if (!expected) return;
  if (this.suspectCount !== expected.suspects || this.suspects.length !== expected.suspects) {
    this.invalidate('suspects', `${this.difficulty} cases require exactly ${expected.suspects} suspects`);
  }
  if (this.clueCount !== expected.clues || this.clues.length !== expected.clues) {
    this.invalidate('clues', `${this.difficulty} cases require exactly ${expected.clues} clues`);
  }
  if (this.hintLimit !== expected.hints) {
    this.invalidate('hintLimit', `${this.difficulty} cases allow exactly ${expected.hints} hints`);
  }
});

export const Case = models.Case || model('Case', caseSchema, 'cases');
