const publicContentKeys = Object.freeze({
  chat: ['conversationTitle', 'participants', 'messages'],
  image: ['visualDescription', 'representation'],
  cctv: ['cameraId', 'location', 'recordedAt', 'startTime', 'endTime', 'videoUrl', 'frames'],
  witness: ['witness', 'statement'],
  document: [
    'entries', 'purchaser', 'items', 'time', 'delivery', 'powerDipAt', 'durationSeconds',
    'eastHumidityChange', 'loadingBayContact', 'note', 'printedScannerState', 'handwrittenNote',
    'ink', 'checkedInWeightGrams', 'morningSleeveWeightGrams', 'expectedSleeveWeightGrams',
    'checkedBy', 'recipient', 'item', 'quantity', 'receivedBy', 'badgeHolder', 'lobbyExit',
    'sideDoorUse', 'systemNote',
  ],
  timeline: ['previousCheck', 'previousStatus', 'currentCheck', 'currentStatus', 'signedBy'],
});

function pick(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source?.[key] !== undefined) result[key] = source[key];
  }
  return result;
}

function publicMessage(message) {
  return pick(message, ['id', 'senderId', 'text', 'timestamp', 'attachmentReference']);
}

function publicChatContent(content) {
  return {
    conversationTitle: content.conversationTitle,
    participants: (content.participants ?? []).map((participant) => pick(participant, ['id', 'displayName'])),
    messages: (content.messages ?? []).map(publicMessage),
  };
}

function publicCctvContent(content) {
  return {
    ...pick(content, publicContentKeys.cctv.filter((key) => key !== 'frames')),
    frames: (content.frames ?? []).map((frame) => pick(frame, ['id', 'timestamp', 'imageUrl', 'description'])),
  };
}

function publicDocumentContent(content) {
  const safe = pick(content, publicContentKeys.document);
  if (Array.isArray(content.entries)) {
    safe.entries = content.entries.map((entry) => pick(entry, ['name', 'key', 'time', 'returnedAt', 'person', 'item', 'action']));
  }
  return safe;
}

function serializeEvidence(evidence) {
  const content = evidence.content ?? {};
  let safeContent = pick(content, publicContentKeys[evidence.type] ?? []);
  if (evidence.type === 'chat') safeContent = publicChatContent(content);
  if (evidence.type === 'cctv') safeContent = publicCctvContent(content);
  if (evidence.type === 'document') safeContent = publicDocumentContent(content);

  return {
    ...pick(evidence, ['id', 'type', 'title', 'description', 'occurredAt', 'source', 'mediaStatus', 'assetUrl']),
    content: safeContent,
  };
}

export function serializePublicClue(clue) {
  // Suspect associations are internal authoring data. Publishing them can reveal
  // the canonical culprit in small deterministic fixture cases.
  return pick(clue, ['id', 'title', 'description', 'evidenceIds']);
}

export function serializePublicCase(record) {
  const caseData = record.case ?? record;

  return {
    id: caseData.id ?? caseData.caseId,
    title: caseData.title,
    summary: caseData.summary,
    category: caseData.category,
    difficulty: caseData.difficulty,
    suspectCount: caseData.suspectCount,
    clueCount: caseData.clueCount,
    hintLimit: caseData.hintLimit,
    incident: pick(caseData.incident, ['description', 'location', 'occurredAt']),
    suspects: (caseData.suspects ?? []).map((suspect) => pick(suspect, [
      'id', 'name', 'age', 'role', 'biography', 'publicMotive', 'alibi', 'personality', 'portraitUrl',
    ])),
    clues: (caseData.clues ?? []).map(serializePublicClue),
    evidence: (caseData.evidence ?? []).map(serializeEvidence),
    timeline: (caseData.timeline ?? []).map((event) => pick(event, ['id', 'occurredAt', 'description', 'evidenceIds'])),
    status: caseData.status,
    source: caseData.source,
    isDevelopmentFixture: caseData.source === 'development_fixture',
    createdAt: caseData.createdAt,
  };
}

export function serializePublicCaseSummary(record) {
  const caseData = record.case ?? record;
  return {
    id: caseData.id ?? caseData.caseId,
    title: caseData.title,
    summary: caseData.summary,
    category: caseData.category,
    difficulty: caseData.difficulty,
    suspectCount: caseData.suspectCount,
    clueCount: caseData.clueCount,
    hintLimit: caseData.hintLimit,
    status: caseData.status,
    source: caseData.source,
    isDevelopmentFixture: caseData.source === 'development_fixture',
    createdAt: caseData.createdAt,
  };
}
