import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
const mediaAssetSchema = new Schema({
  caseId: { type: String, required: true, index: true },
  evidenceId: { type: String, required: true },
  assetType: { type: String, enum: ['image', 'video', 'frame', 'storyboard'], required: true },
  provider: { type: String, default: 'development_fixture' },
  storageKey: { type: String, default: null },
  publicUrl: { type: String, default: null },
  generationStatus: { type: String, enum: ['pending', 'ready', 'failed', 'development_placeholder'], required: true },
  mimeType: { type: String, default: null },
}, { timestamps: true, strict: 'throw' });

mediaAssetSchema.index({ caseId: 1, evidenceId: 1 });

export const MediaAsset = models.MediaAsset || model('MediaAsset', mediaAssetSchema, 'mediaAssets');
