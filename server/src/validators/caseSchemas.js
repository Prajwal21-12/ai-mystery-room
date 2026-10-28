import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const difficultyRules = Object.freeze({
  easy: Object.freeze({ suspectCount: 3, clueCount: 5, hintLimit: 2, baseScore: 100 }),
  medium: Object.freeze({ suspectCount: 4, clueCount: 7, hintLimit: 3, baseScore: 150 }),
  hard: Object.freeze({ suspectCount: 5, clueCount: 9, hintLimit: 3, baseScore: 200 }),
});

const idSchema = z.string().trim().min(1);
const timestampSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Must be a valid date/time');
const uniqueIds = (items) => new Set(items).size === items.length;

export const suspectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  age: z.number().int().positive().optional(),
  role: z.string().trim().min(1),
  biography: z.string().trim().min(1),
  publicMotive: z.string().trim().min(1),
  alibi: z.string().trim().min(1),
  personality: z.string().trim().min(1),
  portraitUrl: z.string().url().nullable().optional(),
});

export const clueSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  evidenceIds: z.array(idSchema).min(1),
  relatedSuspectIds: z.array(idSchema).default([]),
});

export const hintSchema = z.object({
  id: idSchema,
  text: z.string().trim().min(1).max(500),
  order: z.number().int().positive(),
});

const chatMessageSchema = z.object({
  id: idSchema,
  senderId: idSchema,
  text: z.string().trim().min(1),
  timestamp: timestampSchema,
  attachmentReference: idSchema.optional(),
});

const evidenceContentSchema = z.record(z.string(), z.unknown());
const imageContentSchema = z.object({
  visualDescription: z.string().trim().min(1),
  representation: z.string().trim().min(1),
});
const cctvContentSchema = z.object({
  cameraId: idSchema,
  location: z.string().trim().min(1),
  recordedAt: timestampSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  videoUrl: z.string().url().nullable().optional(),
  frames: z.array(z.object({
    id: idSchema,
    timestamp: z.string().min(1),
    imageUrl: z.string().url().nullable().optional(),
    description: z.string().trim().min(1),
  })).default([]),
});
const witnessContentSchema = z.object({
  witness: z.string().trim().min(1),
  statement: z.string().trim().min(1),
});

export const evidenceSchema = z.object({
  id: idSchema,
  type: z.enum(['chat', 'image', 'cctv', 'witness', 'document', 'timeline']),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  occurredAt: timestampSchema.optional(),
  relatedSuspectIds: z.array(idSchema).default([]),
  source: z.string().trim().min(1),
  mediaStatus: z.enum(['not_applicable', 'development_placeholder', 'storyboard', 'pending', 'ready', 'failed']).optional(),
  assetUrl: z.string().url().nullable().optional(),
  content: evidenceContentSchema,
}).superRefine((item, ctx) => {
  if (item.type === 'chat') {
    const result = z.object({
      conversationTitle: z.string().trim().min(1),
      participants: z.array(z.object({ id: idSchema, displayName: z.string().trim().min(1) })).min(2),
      messages: z.array(chatMessageSchema).min(1),
    }).safeParse(item.content);
    if (!result.success) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Chat evidence requires participants and timestamped messages' });
    else {
      const participantIds = result.data.participants.map(({ id }) => id);
      const messageIds = result.data.messages.map(({ id }) => id);
      if (!uniqueIds(participantIds)) ctx.addIssue({ code: 'custom', path: ['content', 'participants'], message: 'Chat participant IDs must be unique' });
      if (!uniqueIds(messageIds)) ctx.addIssue({ code: 'custom', path: ['content', 'messages'], message: 'Chat message IDs must be unique' });
      result.data.messages.forEach((message, index) => {
        if (!participantIds.includes(message.senderId)) ctx.addIssue({ code: 'custom', path: ['content', 'messages', index, 'senderId'], message: 'Message sender must be a conversation participant' });
      });
    }
  }

  if (item.type === 'image' && !['development_placeholder', 'pending', 'ready', 'failed'].includes(item.mediaStatus)) {
    ctx.addIssue({ code: 'custom', path: ['mediaStatus'], message: 'Image evidence must state its media availability' });
  }
  if (item.type === 'image' && !imageContentSchema.safeParse(item.content).success) {
    ctx.addIssue({ code: 'custom', path: ['content'], message: 'Image evidence requires a visual description and representation label' });
  }
  if (item.type === 'image' && item.mediaStatus === 'ready' && !item.assetUrl) {
    ctx.addIssue({ code: 'custom', path: ['assetUrl'], message: 'Ready image evidence requires an available asset URL' });
  }

  if (item.type === 'cctv' && !['storyboard', 'pending', 'ready', 'failed'].includes(item.mediaStatus)) {
    ctx.addIssue({ code: 'custom', path: ['mediaStatus'], message: 'CCTV evidence must state whether it is a clip, storyboard, or unavailable' });
  }
  if (item.type === 'cctv' && !cctvContentSchema.safeParse(item.content).success) {
    ctx.addIssue({ code: 'custom', path: ['content'], message: 'CCTV evidence requires camera, recording window, and frame metadata' });
  }
  if (item.type === 'cctv' && item.mediaStatus === 'ready' && !item.assetUrl && !item.content.videoUrl) {
    ctx.addIssue({ code: 'custom', path: ['assetUrl'], message: 'Ready CCTV evidence requires an available video asset' });
  }
  if (item.type === 'witness' && !witnessContentSchema.safeParse(item.content).success) {
    ctx.addIssue({ code: 'custom', path: ['content'], message: 'Witness evidence requires an identified witness and statement' });
  }
});

export const timelineEventSchema = z.object({
  id: idSchema,
  occurredAt: timestampSchema,
  description: z.string().trim().min(1),
  evidenceIds: z.array(idSchema).min(1),
  relatedSuspectIds: z.array(idSchema).default([]),
});

export const canonicalSolutionSchema = z.object({
  culpritId: idSchema,
  motive: z.string().trim().min(1),
  method: z.string().trim().min(1),
  opportunity: z.string().trim().min(1),
  solutionExplanation: z.string().trim().min(1),
  supportingEvidenceIds: z.array(idSchema).min(2),
  supportingClueIds: z.array(idSchema).min(2),
  suspectExplanations: z.array(z.object({ suspectId: idSchema, explanation: z.string().trim().min(1) })),
});

export const caseSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  originalScenario: z.string().trim().min(1).max(3000),
  summary: z.string().trim().min(1),
  category: idSchema,
  difficulty: difficultySchema,
  suspectCount: z.number().int().positive(),
  clueCount: z.number().int().positive(),
  hintLimit: z.number().int().nonnegative(),
  incident: z.object({
    description: z.string().trim().min(1),
    location: z.string().trim().min(1),
    occurredAt: timestampSchema,
  }),
  suspects: z.array(suspectSchema),
  clues: z.array(clueSchema),
  evidence: z.array(evidenceSchema).min(3),
  timeline: z.array(timelineEventSchema).min(1),
  status: z.literal('ready'),
  source: z.enum(['development_fixture', 'generated']),
  createdAt: timestampSchema,
}).superRefine((data, ctx) => {
  const expected = difficultyRules[data.difficulty];
  if (data.suspectCount !== expected.suspectCount || data.suspects.length !== expected.suspectCount) {
    ctx.addIssue({ code: 'custom', path: ['suspects'], message: `${data.difficulty} cases require exactly ${expected.suspectCount} suspects` });
  }
  if (data.clueCount !== expected.clueCount || data.clues.length !== expected.clueCount) {
    ctx.addIssue({ code: 'custom', path: ['clues'], message: `${data.difficulty} cases require exactly ${expected.clueCount} clues` });
  }
  if (data.hintLimit !== expected.hintLimit) {
    ctx.addIssue({ code: 'custom', path: ['hintLimit'], message: `${data.difficulty} cases allow exactly ${expected.hintLimit} hints` });
  }

  for (const [label, ids, path] of [
    ['suspect', data.suspects.map((item) => item.id), ['suspects']],
    ['clue', data.clues.map((item) => item.id), ['clues']],
    ['evidence', data.evidence.map((item) => item.id), ['evidence']],
    ['timeline event', data.timeline.map((item) => item.id), ['timeline']],
  ]) {
    if (!uniqueIds(ids)) ctx.addIssue({ code: 'custom', path, message: `${label} IDs must be unique` });
  }

  const suspectIds = new Set(data.suspects.map((item) => item.id));
  const evidenceIds = new Set(data.evidence.map((item) => item.id));
  const checkReferences = (ids, validIds, path, label) => {
    ids.forEach((id, index) => {
      if (!validIds.has(id)) ctx.addIssue({ code: 'custom', path: [...path, index], message: `Unknown ${label} reference: ${id}` });
    });
  };

  data.clues.forEach((clue, index) => {
    checkReferences(clue.evidenceIds, evidenceIds, ['clues', index, 'evidenceIds'], 'evidence');
    checkReferences(clue.relatedSuspectIds, suspectIds, ['clues', index, 'relatedSuspectIds'], 'suspect');
  });
  data.evidence.forEach((item, index) => checkReferences(item.relatedSuspectIds, suspectIds, ['evidence', index, 'relatedSuspectIds'], 'suspect'));
  data.timeline.forEach((event, index) => {
    checkReferences(event.evidenceIds, evidenceIds, ['timeline', index, 'evidenceIds'], 'evidence');
    checkReferences(event.relatedSuspectIds, suspectIds, ['timeline', index, 'relatedSuspectIds'], 'suspect');
  });

  const timestamps = data.timeline.map((event) => Date.parse(event.occurredAt));
  if (timestamps.some((time, index) => index > 0 && time < timestamps[index - 1])) {
    ctx.addIssue({ code: 'custom', path: ['timeline'], message: 'Timeline events must be chronological' });
  }
});

export const caseWithSolutionSchema = z.object({
  case: caseSchema,
  solution: canonicalSolutionSchema,
  hints: z.array(hintSchema),
}).superRefine(({ case: caseData, solution, hints }, ctx) => {
  const suspectIds = new Set(caseData.suspects.map((item) => item.id));
  const clueIds = new Set(caseData.clues.map((item) => item.id));
  const evidenceIds = new Set(caseData.evidence.map((item) => item.id));

  if (!suspectIds.has(solution.culpritId)) ctx.addIssue({ code: 'custom', path: ['solution', 'culpritId'], message: 'Culprit must be a suspect in the case' });
  solution.supportingEvidenceIds.forEach((id, index) => {
    if (!evidenceIds.has(id)) ctx.addIssue({ code: 'custom', path: ['solution', 'supportingEvidenceIds', index], message: `Unknown evidence reference: ${id}` });
  });
  solution.supportingClueIds.forEach((id, index) => {
    if (!clueIds.has(id)) ctx.addIssue({ code: 'custom', path: ['solution', 'supportingClueIds', index], message: `Unknown clue reference: ${id}` });
  });
  solution.suspectExplanations.forEach((item, index) => {
    if (!suspectIds.has(item.suspectId)) ctx.addIssue({ code: 'custom', path: ['solution', 'suspectExplanations', index, 'suspectId'], message: `Unknown suspect reference: ${item.suspectId}` });
  });
  if (hints.length !== caseData.hintLimit) ctx.addIssue({ code: 'custom', path: ['hints'], message: `${caseData.difficulty} fixtures require exactly ${caseData.hintLimit} private hints` });
  if (!uniqueIds(hints.map((hint) => hint.id))) ctx.addIssue({ code: 'custom', path: ['hints'], message: 'Hint IDs must be unique' });
  const hintOrders = hints.map((hint) => hint.order);
  if (!uniqueIds(hintOrders) || hintOrders.some((order, index) => order !== index + 1)) {
    ctx.addIssue({ code: 'custom', path: ['hints'], message: 'Hint order must be unique and sequential from 1' });
  }
  if (!uniqueIds(solution.supportingClueIds) || !uniqueIds(solution.supportingEvidenceIds)) {
    ctx.addIssue({ code: 'custom', path: ['solution'], message: 'Supporting clue and evidence references must be unique' });
  }

  const supportingEvidenceThreads = new Set(solution.supportingClueIds.flatMap((clueId) => {
    const linkedClue = caseData.clues.find((item) => item.id === clueId);
    return linkedClue?.evidenceIds ?? [];
  }));
  if (supportingEvidenceThreads.size < 2) {
    ctx.addIssue({ code: 'custom', path: ['solution', 'supportingClueIds'], message: 'The solution must be supported by at least two independent evidence threads' });
  }
});
