import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
const suspectExplanationSchema = new Schema({
  suspectId: { type: String, required: true },
  explanation: { type: String, required: true },
}, { _id: false, strict: 'throw' });

const hintSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true, maxlength: 500 },
  order: { type: Number, required: true, min: 1 },
}, { _id: false, strict: 'throw' });

const solutionSchema = new Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  culpritId: { type: String, required: true, select: false },
  motive: { type: String, required: true, select: false },
  method: { type: String, required: true, select: false },
  opportunity: { type: String, required: true, select: false },
  solutionExplanation: { type: String, required: true, select: false },
  supportingEvidenceIds: { type: [String], required: true, select: false },
  supportingClueIds: { type: [String], required: true, select: false },
  suspectExplanations: { type: [suspectExplanationSchema], required: true, select: false },
  hintBank: { type: [hintSchema], required: true, select: false },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw', minimize: false });

export const CaseSolution = models.CaseSolution || model('CaseSolution', solutionSchema, 'caseSolutions');
