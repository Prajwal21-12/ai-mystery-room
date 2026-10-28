AI MYSTERY ROOM

Master Specification — SPEC.md

Document type: Product Requirements + Technical Specification
Project name: AI Mystery Room
Specification version: 1.0.0
Status: Initial implementation specification
Primary purpose: Single source of truth for Codex
Frontend: React.js
Backend: Node.js + Express.js
Database: MongoDB
AI provider: Google Gemini API
Language: JavaScript (ES Modules)
API architecture: REST
Primary experience: AI-generated, interactive mystery investigation

---

1. PROJECT VISION

1.1 Overview

AI Mystery Room is an interactive web application that transforms a user's short story, scenario, or fictional situation into a playable mystery investigation.

The user provides a scenario such as:

"During a college fest, the winner's trophy disappeared from a locked room. Four students had access to the building, and everyone claims they were somewhere else."

The application uses Gemini on the backend to create a complete fictional investigation, including:

- A compelling mystery and incident description.
- A set of suspects with distinct identities, motives, and alibis.
- Fictional WhatsApp-style conversations.
- AI-generated photographs and visual clues.
- Fictional CCTV recordings, timestamps, and relevant footage.
- Witness statements and other investigative documents.
- Hidden connections and contradictions between pieces of evidence.
- One predetermined culprit.
- A final accusation interface.
- A verdict explaining the correct culprit and the reasoning behind it.

The user investigates the case, opens evidence, connects clues, and selects the person they believe committed the crime.

The application then evaluates the accusation against the original case solution.

1.2 Product goal

Build a polished, engaging mystery-solving website where AI creates the investigation while the user acts as the detective.

The experience should feel like investigating a real case, but all cases, people, messages, images, recordings, and events are fictional and intended for entertainment.

1.3 Core product principles

1. Fair mysteries: The culprit must be determined before gameplay begins.
2. Evidence-based reasoning: The user should be able to solve the mystery using the provided evidence.
3. Internal consistency: Timelines, alibis, locations, identities, and clues must agree with the canonical solution.
4. Interactive investigation: Evidence should be explorable rather than presented as one long text response.
5. AI-generated content: Case narratives, suspects, clues, messages, and media should be generated or prepared through the backend.
6. Server-side protection: The culprit, solution, and hidden reasoning must never be sent to the browser before the user submits a final accusation.
7. Reliable gameplay: A failed AI generation or invalid response must not leave the user with a permanently broken case.
8. Mobile-first usability: The application must work on desktop, tablet, and mobile devices.

---

2. SCOPE AND PRIORITIES

2.1 MVP features — mandatory

The first working release must include:

- Landing page.
- Scenario creation form.
- Mystery generation using Gemini.
- Case briefing.
- Suspect profiles.
- Evidence room.
- Fictional chat-message evidence.
- Image-based evidence.
- CCTV-style evidence.
- Witness statements and timeline.
- Case navigation and progress tracking.
- Culprit selection.
- Final accusation submission.
- Verdict and case explanation.
- Persistent case storage in MongoDB.
- Responsive design.
- Loading, error, retry, and empty states.
- Basic security, input validation, and API error handling.
- Automated tests for critical functionality.
- Difficulty-based suspect and clue counts, hint limits, and backend-calculated scoring.

2.2 Later enhancements — not required for initial release

These features must not delay the MVP:

- User accounts and authentication.
- Public case sharing.
- Multiplayer investigations.
- Leaderboards and global rankings.
- Paid subscriptions.
- Real-time collaborative investigation.
- Voice-based interrogation.
- AI detective chat assistant.
- Procedural 3D crime scenes.
- Advanced animated surveillance footage.
- User-created custom suspect images.
- Admin analytics dashboard.

Build the architecture so these features can be added later without requiring a complete rewrite.

---

3. TARGET USER JOURNEY

The expected gameplay flow is:

1. The user opens the landing page.
2. The user enters a short scenario or story.
3. The user selects difficulty, preferred case category, and optional settings.
4. The frontend submits the scenario to the backend.
5. The backend validates the input and requests a structured investigation from Gemini.
6. The backend validates and normalizes the generated investigation.
7. The application stores the case and its canonical solution in MongoDB.
8. The user sees the case briefing.
9. The user opens the suspect board and examines the suspects.
10. The user investigates the evidence room.
11. The user reads fictional conversations and witness statements.
12. The user examines images and CCTV-style evidence.
13. The user compares timestamps, alibis, and contradictions.
14. The user selects a suspect.
15. The user reviews and confirms the accusation.
16. The backend evaluates the accusation.
17. The user sees the verdict, explanation, and supporting evidence.
18. The user can review the completed case, final score, and start another mystery.

Important: The application must not reveal the culprit, solution explanation, or hidden evidence rationale during steps 1–13.

---

4. FUNCTIONAL REQUIREMENTS

FR-01: Landing Page

The landing page must communicate the purpose of AI Mystery Room immediately.

Required elements:

- Application logo or wordmark.
- Navigation bar.
- Hero headline and short description.
- Primary CTA: "Create a Mystery".
- Secondary CTA: "How It Works".
- Example evidence previews.
- Short explanation of the investigation process.
- Footer with project information and fictional-content disclaimer.

Suggested hero copy:

"Every Mystery Has a Secret."

"Create your own investigation, uncover hidden clues, and discover who is really responsible."

Primary CTA: Create a Mystery

The landing page must be responsive, accessible, and visually consistent with the investigation interface.

FR-02: Scenario Creation

The user must be able to create a case from a short story.

Required inputs:

- Scenario description — required.
- Difficulty — required, default: Medium.
- Case category — optional, default: Any.
- Suspect and clue counts are determined by difficulty and cannot be overridden by the user: Easy (3 suspects, 5 clues), Medium (4 suspects, 7 clues), Hard (5 suspects, 9 clues).
- Investigation theme or optional preferences — optional.

Suggested categories:

- Theft.
- Disappearance.
- Corporate mystery.
- College mystery.
- Historical mystery.
- Locked-room mystery.
- Cyber mystery.
- Any.

The scenario input must:

- Accept plain text.
- Have a configurable maximum length, initially 3,000 characters.
- Reject empty or whitespace-only submissions.
- Display helpful validation messages.
- Prevent accidental duplicate submissions.
- Warn users not to enter real private messages, personal data, or sensitive information.

The form must not require users to provide actual evidence. The AI creates the fictional investigation.

FR-03: Mystery Generation

The backend must generate a complete, internally consistent mystery.

The generation process must produce:

1. Case title.
2. Case summary.
3. Incident description.
4. Incident date and location within the fictional world.
5. Suspect profiles.
6. Suspect motives and alibis.
7. Evidence records.
8. Fictional conversation logs.
9. Image evidence descriptions and assets.
10. CCTV-style evidence and timestamps.
11. Witness statements.
12. A chronological event timeline.
13. Evidence relationships.
14. Contradictions and misleading but fair clues.
15. Canonical culprit.
16. Solution explanation.
17. Supporting evidence references.
18. A final explanation showing why alternative suspects are less likely.
19. Exactly the difficulty-defined number of uniquely identified, discoverable clues.
20. A set of difficulty-limited hints that guide reasoning without naming or directly revealing the culprit.

Generation must occur on the backend, not directly in the browser.

The frontend must display a generation state with meaningful progress messages, such as:

- Creating your case.
- Building suspect profiles.
- Generating evidence.
- Checking the timeline.
- Preparing the investigation.

These messages indicate application stages, not necessarily the exact internal progress of the Gemini model.

The backend must validate the result before publishing the case as playable.

If validation fails, it may retry generation within a configured limit. It must not silently accept an invalid mystery.

If generation fails, show an error and provide a retry action. Do not create a playable case without a valid canonical solution.

FR-04: Case Briefing

The briefing page must show:

- Case title.
- Incident summary.
- Incident location.
- Incident time or date.
- Case category.
- Difficulty.
- Number of suspects.
- Number of evidence items.
- Investigation instructions.
- "Enter Investigation" CTA.

The briefing must not reveal the culprit or the solution.

FR-05: Suspect Board

Suspect counts are fixed by difficulty: Easy has exactly 3, Medium exactly 4, and Hard exactly 5 suspects. No user-provided suspect-count override is allowed.

Each suspect must have:

- Unique suspect ID.
- Display name.
- Fictional age, if relevant.
- Role or relationship to the incident.
- Short biography.
- Motive or apparent reason for suspicion.
- Initial alibi.
- Distinctive personality or behavioral details.
- Optional AI-generated portrait.
- Evidence references connected to the suspect.

Suspects must have meaningful differences in their motives, timelines, and relationships.

Do not generate suspects whose only distinction is their name.

The suspect board must allow the user to open a suspect profile and inspect their available information.

A suspect's secret information must remain hidden until the verdict or until explicitly disclosed through legitimate evidence.

FR-06: Evidence Room

The evidence room is the main investigation interface.

Evidence categories:

1. Chat Messages.
2. Photographs.
3. CCTV Recordings.
4. Witness Statements.
5. Documents.
6. Timeline Clues.

For gameplay and scoring, a clue is a uniquely identified, discoverable information unit in the case. A clue may be embodied in chat, image, CCTV, witness, document, or timeline evidence; one evidence item may contain multiple clues, and one clue may be supported by multiple evidence items. The generated case must contain exactly 5 clues on Easy, 7 on Medium, and 9 on Hard. Clue IDs must be stable and unique within the case. The case must remain logically consistent and solvable, with at least two independent clue threads supporting the canonical solution.

Each evidence item must contain:

- Unique evidence ID.
- Title.
- Type.
- Short description.
- Detailed content or asset reference.
- In-world timestamp, where applicable.
- Related suspect IDs.
- Evidence source.
- Discovery status.
- Optional contextual metadata.

The evidence room must support:

- Category filtering.
- Opening and closing evidence.
- Viewing full evidence details.
- Displaying timestamps.
- Displaying related suspects when appropriate.
- Tracking evidence already examined.
- Returning to the investigation without losing progress.

Evidence should be presented through appropriate visual interfaces instead of displaying all information as plain paragraphs.

FR-07: Fictional Chat Evidence

Chat evidence must be rendered as a fictional messaging interface.

Required fields:

- Conversation title.
- Fictional participants.
- Participant labels.
- Messages.
- Message timestamps.
- Optional edited or deleted-message indicators, if justified by the story.
- Related evidence references.

Each message must contain:

- Message ID.
- Sender ID.
- Message text.
- Timestamp.
- Optional attachment reference.

The messages must contribute meaningful information to the investigation.

Examples include conflicting alibis, suspicious coordination, concealed motives, and conversations that clarify a timeline.

The UI may use a familiar chat-bubble layout, but it must not access real WhatsApp accounts, import real conversations, or present generated conversations as authentic records.

Display a discreet but visible label: "AI-generated fictional evidence."

FR-08: Image Evidence

Image evidence must support generated photographs, scene images, objects, and visual clues.

Each image evidence record must include:

- Evidence ID.
- Image title.
- Image description.
- Asset URL or storage key.
- Generation prompt or generation metadata, stored privately if needed.
- Associated suspects.
- Relevant visual clue description, kept hidden until the verdict when appropriate.
- Optional timestamp or camera metadata.

Images must be generated or prepared through a backend-controlled media pipeline.

The Gemini text-generation model must not be assumed to generate image files unless the configured model explicitly supports image generation.

Use a compatible image-generation provider or model when necessary. Keep image generation behind a provider abstraction so the rest of the application does not depend on one specific media API.

If image generation is unavailable, the case must not pretend that an actual photograph was created. The system may use an explicitly labeled illustrative placeholder for development, but production evidence must follow the configured media policy.

Generated images must not be presented as authentic photographs of real people or actual crime scenes.

FR-09: CCTV Evidence

CCTV evidence must be an interactive evidence type, not merely an ordinary text paragraph.

A CCTV evidence item should contain:

- Camera ID.
- Camera location.
- Recording date.
- Start and end times.
- Video asset reference, when available.
- Relevant timestamps.
- Short event description.
- Optional still frames.
- Related suspect IDs.
- A clue that can be discovered by examining the footage.

The intended production experience is AI-generated fictional surveillance footage.

Use a compatible video-generation service when available. Do not assume the Gemini text model can produce playable video files.

The CCTV pipeline must support:

- A playable generated clip.
- Generated still frames with timestamps.
- A storyboard or time-coded reconstruction during development.

The interface must clearly distinguish an actual generated clip from a storyboard or still-frame reconstruction.

The case may be published with a reduced-media mode only if the required MVP evidence remains sufficient to solve the case. It must never display a fake video player for an asset that does not exist.

CCTV evidence should contribute information that can be compared against suspect alibis and other evidence.

FR-10: Timeline and Contradictions

The application must provide a chronological timeline of significant case events.

The timeline should include:

- Incident time.
- Suspect movements where relevant.
- Messages or calls within the fictional story.
- Camera observations.
- Witness observations.
- Important events established by evidence.

The timeline should help the user identify inconsistencies without revealing the solution.

The canonical event timeline must be consistent with the generated messages, evidence timestamps, and suspect alibis.

Any contradiction intentionally introduced into the story must have a clear explanation in the canonical solution.

FR-11: Progress Tracking

The application must track investigation progress for each case.

At minimum:

- Evidence examined.
- Suspect profiles viewed.
- Current investigation stage.
- Selected suspect, if any.
- Whether the accusation has been submitted.
- Final outcome, if completed.
- Unique discovered clue IDs and the number of hints used.
- Final score after accusation submission.

Progress should survive page refreshes.

For the MVP, anonymous users can be supported through a persistent case ID and browser-local case history, with server-side case data stored in MongoDB.

Use an opaque case identifier and do not expose internal database credentials or privileged solution data.

FR-12: Culprit Selection

The accusation page must display the suspect candidates and allow the user to select exactly one culprit.

The user must be able to:

- Review the suspect list.
- Select a suspect.
- Change the selection before submission.
- Optionally provide a short explanation for the accusation.
- Confirm the final accusation.

The interface must clearly warn that submitting the accusation will reveal the verdict.

The server must validate the selected suspect ID against the case's actual suspect list.

The application must not accept a culprit ID from the browser as the canonical answer. The server compares the user's selection against its stored solution.

FR-13: Verdict and Explanation

After a valid accusation, the server returns the result.

The verdict page must show:

- Correct or incorrect result.
- User's selected suspect.
- Actual culprit.
- Full solution explanation.
- Primary supporting clues.
- Explanation of important contradictions.
- Why the culprit's alibi or statements fail.
- Explanation of misleading evidence.
- Why the other suspects are not the culprit.
- Option to review evidence.
- Option to start another mystery.

The explanation must refer to actual evidence IDs from the case.

The application must not invent new evidence during the verdict stage to justify the answer.

A case should be playable again in review mode, but repeated accusation submissions must not create inconsistent results or duplicate completion records.

FR-14: Case History

The MVP should support a list of previously created cases for the current browser.

Each case-history item should display:

- Case title.
- Creation date.
- Difficulty.
- Investigation status.
- Final result, if completed.

The user should be able to reopen an existing case and continue investigating.

Case history is not a substitute for server-side persistence. The backend remains the source of truth for case content and the canonical solution.

FR-15: Clue Discovery

The interface must allow a user to mark an available clue as discovered. Discovery is recorded against the authorized investigation session, is idempotent per clue, and awards clue points only once. The client may display progress, but the backend validates clue membership and owns discovery state and scoring.

FR-16: Hints

The user may request hints during an investigation. Easy permits at most 2 hints; Medium and Hard permit at most 3 hints each. Each successful request consumes one hint, is recorded by the backend, and incurs the scoring penalty. Hints must be relevant and progressively guide reasoning without directly naming or revealing the culprit. Requests beyond the difficulty limit are rejected without changing session state or score. Retries of the same request must not consume extra hints; use an idempotency key or equivalent request deduplication.

FR-17: Scoring and Results

The backend calculates and persists the final score when an accusation is accepted. Let B be the difficulty base (Easy 100, Medium 150, Hard 200), D the number of unique discovered clues (bounded by the case's required clue count), H the number of successfully used hints, and C be 1 for a correct accusation and 0 otherwise. The final score is `max(0, (C * B) + (5 * D) - (10 * H))`. Store a breakdown with `basePoints = C * B`, `cluePoints = 5 * D`, and `hintPenalty = 10 * H`; `finalScore = max(0, basePoints + cluePoints - hintPenalty)`. An incorrect accusation receives no base points but retains discovered-clue points less hint penalties. The result page must show the score, correctness, selected suspect, actual culprit, solution explanation, and supporting evidence. Score data must come only from trusted backend state; clients cannot submit or override D, H, C, B, or the resulting score.

---

5. AI AND MYSTERY GENERATION DESIGN

5.1 AI provider

Use Google Gemini through the official `@google/genai` SDK and API.

All Gemini calls must originate from the backend.

The API key must be stored in an environment variable and never exposed to the React frontend.

The model name must be configurable rather than hardcoded throughout the codebase.

Example configuration:

- "GEMINI_API_KEY"
- "GEMINI_MODEL"
- "GEMINI_IMAGE_MODEL" — if a compatible image model is configured.
- "GEMINI_VIDEO_MODEL" — only if a compatible video model is configured.

Use the current supported model identifiers and capabilities available when implementation begins.

5.2 Generation pipeline

The backend should use the following pipeline:

Step 1 — Parse scenario

Extract the incident, context, setting, constraints, and user preferences.

Step 2 — Create the case blueprint

Determine the true culprit, motive, method, opportunity, chronology, and core solution before constructing the evidence.

Step 3 — Create suspects

Generate the exact difficulty-defined suspect count (Easy 3, Medium 4, Hard 5) with distinct motives, access, and alibis.

Step 4 — Construct evidence

Create the chat logs, image descriptions, CCTV events, documents, witness statements, and other clues.

Step 5 — Establish relationships

Connect evidence to suspects, events, and contradictions using stable IDs.

Step 6 — Validate the case

Check the structure, references, chronology, and solution consistency.

Step 7 — Prepare media

Generate required visual assets using compatible providers and associate them with the appropriate evidence records.

Step 8 — Finalize the case

Save the case, solution, and evidence in MongoDB.

Step 9 — Publish the playable case

Return only the public case representation to the frontend.

The case must not become playable until the canonical solution and required evidence have passed validation.

5.3 Structured output

Request structured JSON output where supported.

Do not rely on free-form text parsing as the primary mechanism.

The server must:

- Parse the returned JSON.
- Validate it against a defined schema.
- Reject missing required fields.
- Reject invalid suspect references.
- Reject invalid evidence references.
- Check that exactly one canonical culprit exists.
- Check that the canonical culprit is a valid suspect.
- Check that the solution cites supporting evidence.
- Validate chronological consistency.
- Sanitize displayed text.
- Retry a bounded number of times when appropriate.

Use a schema validation library such as Zod.

5.4 Mystery quality requirements

Every playable mystery must satisfy these requirements:

1. There is exactly one intended culprit.
2. The culprit has a plausible motive and opportunity.
3. The evidence provides a fair path to identifying the culprit.
4. At least three evidence items contribute to the solution.
5. At least two independent clues support the final accusation.
6. The solution explanation references existing evidence.
7. No decisive clue depends on information that was never presented.
8. Suspect alibis and evidence timestamps are consistent unless a contradiction is intentional.
9. Misleading clues have an explanation.
10. The case contains no accidental solution disclosure in the public data.
11. Counts are derived from difficulty and are not user-overridable settings.
12. Evidence IDs are unique within the case.
13. Suspect counts exactly match difficulty: Easy 3, Medium 4, Hard 5.
14. The case contains exactly 5 unique clues on Easy, 7 on Medium, and 9 on Hard. Clues are independently identified gameplay facts, even when presented through larger evidence items.
15. Each clue has a stable unique clue ID, is discoverable, and supports a logically consistent and solvable case. The clue set includes at least two independent clue threads supporting the solution.

Difficulty controls the exact suspect and clue counts above. Easy clues may be more direct; Medium should require connecting clues; Hard should require connecting several pieces of evidence. Keep clue count exact without weakening solvability.

5.5 Solution immutability

The canonical solution must be established before the user begins investigating.

The culprit must not change when:

- The user refreshes the page.
- The user opens another evidence item.
- The user submits an accusation.
- The user requests the verdict.
- The browser retries a failed request.

Never regenerate the culprit during verdict evaluation.

5.6 Difficulty rules and scoring

Difficulty is fixed when the case is created and determines exact counts and base score:

Difficulty | Suspects | Clues | Hint limit | Correct-accusation base
Easy | 3 | 5 | 2 | 100 points
Medium | 4 | 7 | 3 | 150 points
Hard | 5 | 9 | 3 | 200 points

For scoring, D is the number of unique clue IDs recorded as discovered by the backend for the investigation session, capped at the case clue count. H is the number of successfully served hints for that session, never greater than the difficulty limit. C is 1 when the submitted suspect matches the canonical culprit and 0 otherwise. B is the difficulty base score above. The final score is `max(0, (C * B) + (5 * D) - (10 * H))`. Store a breakdown with `basePoints = C * B`, `cluePoints = 5 * D`, and `hintPenalty = 10 * H`; `finalScore = max(0, basePoints + cluePoints - hintPenalty)`.

A correct accusation earns the base score plus 5 points per discovered clue, minus 10 points per hint. An incorrect accusation earns no base points but still receives discovered-clue points less hint penalties, floored at zero. The backend derives every input from persisted case/session state, calculates the score once when the accusation is finalized, and persists the immutable score and breakdown. The browser must never submit scoring inputs or a score as authoritative data.

5.7 Handling unsupported media generation

Text generation and media generation must be treated as separate capabilities.

The backend must check whether the configured provider can actually create the requested asset.

If video generation is not configured, the application may use time-coded AI-generated still frames or an explicitly labeled reconstruction.

If image generation is not configured, the application may use clearly labeled development placeholders until a compatible provider is available.

Do not claim that Gemini generated an actual image or video if it only generated a textual description.

---

6. DATA CONTRACTS

The following is the conceptual contract. Implement the exact types and validation rules in shared or backend schema definitions.

6.1 Public case representation

{
  "id": "case_id",
  "title": "The Missing Trophy",
  "summary": "A trophy disappeared during a college festival.",
  "category": "college_mystery",
  "difficulty": "medium",
  "suspectCount": 4,
  "clueCount": 7,
  "incident": {
    "description": "A trophy disappeared from a locked room.",
    "location": "College auditorium",
    "occurredAt": "2026-10-20T18:30:00Z"
  },
  "suspects": [
    {
      "id": "suspect_01",
      "name": "Alex Morgan",
      "role": "Event coordinator",
      "biography": "Responsible for managing the event.",
      "publicMotive": "Had access to the trophy room.",
      "alibi": "Claims to have been backstage.",
      "portraitUrl": null
    }
  ],
  "clues": [
    {"id": "clue_01", "title": "A unique discoverable fact", "description": "Public clue content", "evidenceIds": ["evidence_01"]}
  ],
  "evidence": [
    {
      "id": "evidence_01",
      "type": "chat",
      "title": "Group Conversation",
      "description": "A conversation from the evening.",
      "occurredAt": "2026-10-20T18:10:00Z",
      "relatedSuspectIds": ["suspect_01"],
      "content": {}
    }
  ],
  "timeline": [
    {
      "id": "event_01",
      "occurredAt": "2026-10-20T18:10:00Z",
      "description": "A message was sent.",
      "evidenceIds": ["evidence_01"]
    }
  ],
  "status": "ready",
  "createdAt": "2026-10-25T06:00:00Z"
}

This is an illustrative shape, not a complete case fixture. Actual cases must contain the required evidence content and schema fields. The public case must expose exactly 5/7/9 clue records for Easy/Medium/Hard, respectively, with unique IDs and public clue text; it must not expose hidden solution interpretations or future hint text. Evidence item count is separate from clue count.

Security rule: This public response must never contain "culpritId", hidden solution reasoning, secret evidence interpretations, or private generation prompts.

6.2 Canonical solution — private server representation

{
  "culpritId": "suspect_02",
  "motive": "Wanted to conceal a financial discrepancy.",
  "method": "Used an unmonitored access route.",
  "opportunity": "The timeline establishes access during the incident.",
  "solutionExplanation": "The evidence establishes the culprit's actions.",
  "supportingEvidenceIds": [
    "evidence_03",
    "evidence_05",
    "evidence_07"
  ],
  "suspectExplanations": [
    {
      "suspectId": "suspect_01",
      "explanation": "The evidence does not establish their involvement."
    }
  ]
}

Store this separately from public case data, or use strict response projections that guarantee these fields are excluded.

The actual schema must require exactly one valid culprit and at least two independent supporting clues.

6.3 Chat evidence

{
  "conversationTitle": "Event Planning Chat",
  "participants": [
    {
      "id": "person_01",
      "displayName": "Alex"
    },
    {
      "id": "person_02",
      "displayName": "Sam"
    }
  ],
  "messages": [
    {
      "id": "message_01",
      "senderId": "person_01",
      "text": "Did you lock the storage room?",
      "timestamp": "2026-10-20T18:10:00Z"
    }
  ]
}

6.4 CCTV evidence

{
  "cameraId": "CAM-03",
  "location": "East Corridor",
  "recordedAt": "2026-10-20T18:20:00Z",
  "startTime": "18:20:00",
  "endTime": "18:25:00",
  "mediaStatus": "storyboard",
  "videoUrl": null,
  "frames": [
    {
      "id": "frame_01",
      "timestamp": "18:21:15",
      "imageUrl": null,
      "description": "A person enters the corridor."
    }
  ],
  "relatedSuspectIds": ["suspect_02"]
}

"mediaStatus" must distinguish actual video from still-frame or storyboard representations.

6.5 Image evidence

{
  "title": "The Open Storage Cabinet",
  "description": "A photograph of the storage cabinet.",
  "assetUrl": null,
  "mediaStatus": "pending",
  "relatedSuspectIds": ["suspect_02"]
}

Media status should support at least "pending", "ready", and "failed", with explicit representation types for image and video assets.

---

7. MONGODB DATA MODEL

Use Mongoose for database models.

7.1 Case collection

Collection: "cases"

Fields:

- "_id"
- "title"
- "originalScenario"
- "category"
- "difficulty"
- "incident"
- "suspects"
- "evidence"
- "clues" (exact difficulty-defined count, stable unique IDs, evidence references)
- "timeline"
- "solution" or a reference to a private solution record
- "status"
- "generationMetadata"
- "createdAt"
- "updatedAt"

Suggested statuses:

- "generating"
- "validating"
- "preparing_media"
- "ready"
- "failed"

For the MVP, embedding suspects, evidence metadata, and timeline entries inside a case document is acceptable. Store large media files in object storage rather than directly inside MongoDB documents.

The canonical solution must be excluded from all public case projections.

7.2 Private solution collection

Collection: "caseSolutions"

Fields:

- "caseId"
- "culpritId"
- "motive"
- "method"
- "opportunity"
- "solutionExplanation"
- "supportingEvidenceIds"
- "suspectExplanations"
- "hintBank" (difficulty-appropriate, ordered hints that guide without revealing culprit)
- "createdAt"

Use a unique index on "caseId".

The solution collection must be accessible only to trusted backend services.

7.3 Investigation session collection

Collection: "investigationSessions"

Fields:

- "_id"
- "caseId"
- "sessionTokenHash" or another appropriate anonymous-session identifier
- "examinedEvidenceIds"
- "discoveredClueIds" (unique clue IDs; unique per session)
- "hintsUsed"
- "hintRequests" (request ID and stored response snapshot for safe idempotent replay)
- "viewedSuspectIds"
- "selectedSuspectId"
- "status"
- "result" (including immutable correctness and final score)
- "accusationSubmittedAt"
- "createdAt"
- "updatedAt"

Suggested session statuses:

- "investigating"
- "completed"

Enforce one final outcome per session. Persist discovery and hint state atomically; use unique set semantics for discovered clue IDs and deduplicate hint requests. Persist the final score and immutable score breakdown inside the session result.

7.4 Media asset collection

Collection: "mediaAssets"

Fields:

- "_id"
- "caseId"
- "evidenceId"
- "assetType"
- "provider"
- "storageKey"
- "publicUrl"
- "generationStatus"
- "mimeType"
- "createdAt"
- "updatedAt"

Use appropriate indexes for case and evidence lookups.

Do not store API keys or other secrets in these records.

7.5 Database rules

- Use MongoDB Atlas or a compatible MongoDB deployment.
- Validate environment configuration at startup.
- Add indexes for frequently queried fields.
- Handle missing records safely.
- Do not expose raw Mongoose documents to the frontend.
- Use DTOs or explicit response serializers.
- Set configurable retention and cleanup policies.
- Keep session access scoped to the correct case and session owner.

---

8. REST API SPECIFICATION

Base path: "/api/v1"

All endpoints must use consistent JSON responses.

8.1 Health check

"GET /api/v1/health"

Response:

{
  "success": true,
  "data": {
    "status": "ok"
  }
}

Use this to verify backend health and deployment readiness.

8.2 Create a mystery

"POST /api/v1/cases"

Request:

{
  "scenario": "A trophy disappears during a college festival.",
  "difficulty": "medium",
  "category": "college_mystery"
}

Response:

{
  "success": true,
  "data": {
    "caseId": "case_id",
    "status": "generating"
  }
}

Return HTTP "202 Accepted" when generation is asynchronous.

The backend must enforce scenario validation, generation limits, and idempotency where applicable. Difficulty must be one of Easy, Medium, or Hard. The client cannot supply or override suspectCount or clueCount; the backend derives both from difficulty.

8.3 Check generation status

"GET /api/v1/cases/:caseId/status"

Returns:

- Current generation status.
- Safe progress information.
- A user-facing error code if generation failed.
- A retry option or retry instructions when appropriate.

Never return private prompts or the canonical solution.

8.4 Get a case

"GET /api/v1/cases/:caseId"

Returns the public case representation for the requested `caseId`.

It must reject access to cases that are still generating or have failed validation.

8.5 Get a suspect

"GET /api/v1/cases/:caseId/suspects/:suspectId"

Returns the public profile of a valid suspect.

The server must verify that the suspect belongs to the requested case.

8.6 Get evidence

"GET /api/v1/cases/:caseId/evidence"

Supports optional query parameters:

- "type"
- "limit"
- "cursor"

Return only public evidence.

8.7 Get one evidence item

"GET /api/v1/cases/:caseId/evidence/:evidenceId"

Returns the complete public evidence item.

Validate both case ID and evidence ID.

8.8 Create an investigation session

"POST /api/v1/cases/:caseId/sessions"

Creates an anonymous investigation session and returns:

- Session ID.
- Session access credential, if needed.
- Current progress, including discovered clues and hints used/remaining.

Use a secure opaque token or another appropriate session mechanism. Never trust a client-supplied session ID without validating ownership.

8.9 Update investigation progress

"PATCH /api/v1/sessions/:sessionId/progress"

Request:

{
  "examinedEvidenceIds": ["evidence_01"],
  "viewedSuspectIds": ["suspect_01"]
}

Validate all referenced IDs against the case.

The backend should prevent one session from modifying another session's progress.

8.10 Discover a clue

"POST /api/v1/cases/:caseId/clues/:clueId/discover"

Require the authorized investigation session credential (for example, an Authorization header) and validate that the clue belongs to this ready case. Record the clue in the session exactly once. Return the public clue content and updated discovery state. Repeated discovery requests return the same clue content and current discovery state and never award duplicate points.

8.11 Request a hint

"POST /api/v1/cases/:caseId/hints"

Request body: {"sessionId":"session_id", "requestId":"opaque_id"}. Validate session ownership and case match. Return one hint and updated hints-used/remaining counts. Enforce Easy 2, Medium 3, Hard 3. A repeated requestId returns the same prior response without consuming another hint. Reject exhausted limits with HTTP 409 and no state change. Hints must not name or directly reveal the culprit.

8.12 Submit accusation

"POST /api/v1/cases/:caseId/accuse"

Request body: {"sessionId":"session_id", "suspectId":"suspect_id", "reason":"optional explanation"}. Validate session ownership, case and suspect membership, and that the session has not already submitted an accusation. Determine correctness and score exclusively from persisted server-side difficulty, discovered clue IDs, and hints used; atomically persist one immutable outcome. Repeated submissions return the existing result or HTTP 409 and must never change the score or outcome.

8.13 Retrieve completed result

"GET /api/v1/cases/:caseId/result?sessionId=session_id"

Require session ownership and a completed accusation. Return correctness, selected suspect, culprit, explanation, supporting evidence IDs, persisted final score, and score breakdown (`basePoints`, `cluePoints`, `hintPenalty`). Before completion return HTTP 409. Do not expose solution fields through any other case endpoint.

8.14 API response format

Success:

{
  "success": true,
  "data": {}
}

Failure:

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide a valid scenario."
  }
}

Use correct HTTP status codes, including:

- "200" — successful read or action.
- "201" — resource created synchronously.
- "202" — asynchronous generation accepted.
- "400" — invalid request.
- "401" or "403" — unauthorized or forbidden access where applicable.
- "404" — resource not found.
- "409" — conflicting state or duplicate final submission.
- "413" — request too large.
- "429" — rate limit exceeded.
- "500" — unexpected server error.
- "502" or "503" — upstream provider failure or temporary service unavailability.

Do not expose stack traces, API keys, provider credentials, or internal solution data in error responses.

---

9. FRONTEND SPECIFICATION

9.1 Technology

- React.js.
- Vite.
- JavaScript with ES Modules.
- React Router.
- Fetch API or Axios.
- Tailwind CSS as the project-wide styling system; use utility classes and shared components consistently.
- A reusable component system.
- Lucide icons or another consistent icon library.

Do not introduce a second frontend framework.

Keep state management simple for the MVP. Use React state and context where appropriate; introduce a larger state-management library only when justified.

9.2 Required routes

Route| Purpose
"/"| Landing page
"/create"| Scenario creation
"/case/:caseId"| Case briefing
"/case/:caseId/investigate"| Main investigation workspace
"/case/:caseId/suspects"| Suspect board
"/case/:caseId/evidence"| Evidence room
"/case/:caseId/timeline"| Timeline view
"/session/:sessionId/accuse"| Culprit selection
"/session/:sessionId/verdict"| Final verdict
"/history"| Case history
"*"| Not-found page

The main investigation workspace may combine the suspect board, evidence room, timeline, clue discovery, and hints in a tabbed interface. Separate routes must still work correctly when loaded directly. Show discovered-clue progress and hints used/remaining during investigation, and show the persisted final score and breakdown on the results page.

9.3 Design direction

Create a premium, cinematic investigative interface.

Visual references in terms of design direction:

- Modern detective investigation dashboards.
- Case-management interfaces.
- Cinematic mystery games.
- Evidence boards and digital investigation rooms.

The application should feel serious, immersive, and polished without being cluttered.

Suggested design system:

- Dark charcoal or deep navy background.
- Muted gray secondary surfaces.
- Off-white primary text.
- Restrained red or amber accents.
- Clear visual hierarchy.
- Consistent spacing and typography.
- Subtle transitions.
- Readable evidence cards.
- Clear timestamps and status indicators.

Avoid excessive neon, random gradients, distracting animations, and overly decorative elements that reduce readability.

Use a consistent theme across every route.

9.4 Main investigation layout

On desktop, use:

- Top navigation bar with case title and status.
- Left sidebar for navigation and suspect access.
- Main content area for evidence.
- Optional right-side case notes or timeline panel.

On mobile, collapse the sidebars into an accessible navigation drawer or compact tab bar.

The user must always know:

- Which case is open.
- Which evidence category is selected.
- Which suspect profiles are available.
- How to return to the investigation.
- How to submit the final accusation.

9.5 Required reusable components

- "AppLayout"
- "Navbar"
- "Sidebar"
- "PageHeader"
- "CaseCard"
- "ScenarioForm"
- "GenerationProgress"
- "CaseBriefing"
- "SuspectCard"
- "SuspectProfile"
- "EvidenceCard"
- "EvidenceGrid"
- "EvidenceViewer"
- "ChatEvidenceViewer"
- "ImageEvidenceViewer"
- "CCTVEvidenceViewer"
- "WitnessStatementViewer"
- "TimelineView"
- "ProgressIndicator"
- "ClueDiscoveryControl"
- "HintPanel"
- "ScoreSummary"
- "AccusationPanel"
- "VerdictPanel"
- "ErrorState"
- "EmptyState"
- "LoadingSkeleton"
- "ConfirmDialog"
- "Toast"

Reuse components instead of duplicating layouts across pages.

9.6 Frontend state

The frontend should track:

- Current case.
- Current session.
- Selected navigation tab.
- Selected evidence.
- Examined evidence IDs.
- Discovered clue IDs and clue progress.
- Hints used and remaining hint count.
- Current score preview derived from server state (never authoritative locally).
- Viewed suspect IDs.
- Selected culprit.
- Generation and request status.
- Verdict visibility.
- User-facing error messages.

Do not store Gemini API keys or canonical solutions in frontend state.

Persist only appropriate UI and progress information. The server must remain authoritative for session completion and verdicts.

9.7 Accessibility

- Semantic HTML.
- Keyboard-accessible navigation.
- Visible focus indicators.
- Proper form labels.
- Accessible dialog behavior.
- Sufficient color contrast.
- Alternative text for images.
- Clear error announcements.
- No essential information conveyed by color alone.
- Respect reduced-motion preferences.

---

10. BACKEND ARCHITECTURE

10.1 Technology

- Node.js.
- Express.js.
- MongoDB.
- Mongoose.
- Google Gemini API through the official `@google/genai` SDK.
- Zod for request, response, AI output, and persisted contract validation.
- A supported media-generation provider when required.
- An appropriate media storage service for production assets.

10.2 Folder structure

Use a clear, modular structure.

ai-mystery-room/
├── SPEC.md
├── README.md
├── .gitignore
├── package.json
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── routes/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── features/
│       │   ├── cases/
│       │   ├── suspects/
│       │   ├── evidence/
│       │   ├── timeline/
│       │   ├── investigation/
│       │   └── verdict/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── utils/
│       └── styles/
├── server/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       │   ├── gemini/
│       │   ├── case-generation/
│       │   ├── validation/
│       │   ├── media/
│       │   └── verdict/
│       ├── models/
│       ├── middleware/
│       ├── validators/
│       ├── utils/
│       └── tests/
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    └── DATA_MODEL.md

The exact structure may evolve as implementation progresses, but responsibilities must remain separated.

10.3 Backend responsibilities

- API routing.
- Input validation.
- Scenario processing.
- Gemini requests.
- Structured AI output validation.
- Canonical solution management.
- Evidence relationship validation.
- Media-generation orchestration.
- MongoDB persistence.
- Session management.
- Accusation evaluation.
- Error handling.
- Rate limiting.
- Clue discovery ownership, invalid clues, duplicate discovery, and one-time points.
- Hint retrieval, limit enforcement, request retry deduplication, and session isolation.
- Accusation score calculation, immutable duplicate submissions, and result retrieval before/after completion.
- Exact public clue counts and private hint bank/solution separation.
- Security enforcement.
- Logging and diagnostics.

Controllers should remain thin. Business logic belongs in services.

10.4 Configuration

Use environment variables for all secrets and environment-specific settings.

Example server environment:

PORT=5000
NODE_ENV=development
MONGODB_URI=
GEMINI_API_KEY=
GEMINI_MODEL=
CLIENT_ORIGIN=http://localhost:5173

Optional media settings:

IMAGE_PROVIDER=
IMAGE_MODEL=
IMAGE_API_KEY=
VIDEO_PROVIDER=
VIDEO_MODEL=
VIDEO_API_KEY=
MEDIA_STORAGE_PROVIDER=
MEDIA_STORAGE_BUCKET=

Only configure providers that are actually implemented.

Do not commit ".env" files. Include a ".env.example" with empty placeholder values.

Validate required environment variables at startup and show a safe, actionable configuration error if any are missing.

10.5 Request lifecycle

For every protected or stateful endpoint:

1. Parse the request.
2. Validate input.
3. Authenticate or validate session ownership as applicable.
4. Check resource state.
5. Execute the business operation.
6. Persist state where required.
7. Serialize a safe response.
8. Return a consistent status code.

Use centralized error middleware and structured logging.

---

11. SECURITY AND PRIVACY

Security is mandatory, even for an entertainment project.

11.1 API key protection

- Gemini API keys must remain on the backend.
- Never expose secrets through Vite environment variables prefixed with "VITE_".
- Never commit secrets to Git.
- Do not print secrets in logs.
- Keep provider configuration separate from client configuration.

11.2 Input protection

- Validate all request bodies.
- Enforce scenario length limits.
- Sanitize or safely render user-provided text.
- Do not render arbitrary AI-generated HTML.
- Prevent NoSQL injection.
- Validate IDs before database queries.
- Apply request size limits.

11.3 API abuse protection

- Apply rate limits to case generation.
- Set reasonable provider timeouts.
- Limit concurrent generation jobs.
- Bound retries.
- Avoid duplicate jobs for repeated submissions.
- Configure request and generation budgets.

11.4 Session protection

- Use opaque session identifiers or secure tokens.
- Validate session ownership for every session endpoint.
- Do not treat an unguessable case ID as the only authorization control.
- Do not let users modify arbitrary session IDs or outcomes.
- Make final accusations immutable for the relevant session.
- Calculate score exclusively on the backend from persisted, validated session state.
- Prevent duplicate clue points, hint-limit bypasses, score tampering, and duplicate accusation submissions.

If cookie-based authentication is introduced, configure "HttpOnly", "Secure" in production, and an appropriate "SameSite" policy. Add CSRF protections where applicable.

11.5 Fictional-content safeguards

- Display an entertainment disclaimer.
- Label generated chats and surveillance materials as fictional.
- Do not connect to real messaging accounts or CCTV systems.
- Do not imply that generated media is authentic evidence.
- Avoid generating identifiable depictions of real people in criminal scenarios.
- Avoid realistic documents that could be mistaken for official evidence.
- Do not store unnecessary personal information.

11.6 Media security

- Store generated media in controlled storage.
- Validate media type and file size.
- Use appropriate storage permissions.
- Avoid executing uploaded or generated content.
- Do not permit arbitrary remote URLs to be fetched by the backend.
- Avoid public exposure of internal prompts, temporary files, or private metadata.

---

12. ERROR HANDLING AND RESILIENCE

The application must handle these conditions gracefully:

Situation| Expected behavior
Empty scenario| Show form validation
Invalid difficulty| Reject the request
Gemini timeout| Mark generation failed or retry safely
Gemini quota exceeded| Show a friendly retry message
Invalid AI JSON| Validate, retry within limits, then fail safely
Missing culprit| Reject the generated case
Invalid evidence reference| Reject the generated case
Media provider failure| Mark the asset failed and apply the configured media policy
Case not found| Display a not-found state
Unauthorized session access| Reject access
Invalid suspect ID| Reject accusation submission
Invalid clue ID or unauthorized clue discovery| Reject the request without changing discovery state or score
Hint limit exhausted| Return a conflict without consuming another hint
Duplicate hint request ID| Replay the original hint response without changing hint count
Score tampering attempt| Ignore client score fields or reject the request
Duplicate accusation| Return the existing outcome or a conflict response
Database unavailable| Return a safe service error
Network interruption| Preserve safe local progress and allow retry
Page refresh| Restore the case and progress
Expired session| Offer a safe recovery or new session path

Do not show raw provider errors directly to users.

Use structured logs with request IDs and case IDs. Never log API secrets or unnecessary personal data.

---

13. TESTING REQUIREMENTS

Use appropriate tools such as Vitest for frontend and shared validation tests, and Jest or Vitest with Supertest for backend API tests.

Use mocked AI providers for deterministic automated tests.

13.1 Unit tests

Test:

- Scenario validation.
- Difficulty validation.
- AI response schema validation.
- Suspect ID validation.
- Evidence relationship validation.
- Timeline consistency rules.
- Canonical culprit validation.
- Verdict evaluation.
- Public/private field separation.
- Session state transitions.
- Difficulty-to-suspect, clue, hint, and base-score mapping.
- Exact clue-count validation and clue relationship/solvability invariants.
- Idempotent clue discovery and one-time clue points.
- Hint limits, request deduplication, and non-revealing hint content.
- Backend score formula for each difficulty, correct and incorrect accusations, hint penalties, and zero floor.

13.2 API tests

Test:

- Health check.
- Case creation.
- Case generation failure.
- Case status polling.
- Public case retrieval.
- Evidence retrieval.
- Session creation.
- Progress updates.
- Clue discovery, duplicate discovery, and one-time clue scoring.
- Hint requests, hint-limit enforcement, retry idempotency, and non-revealing content.
- Unauthorized session access.
- Accusation submission and server-derived score persistence.
- Duplicate accusation.
- Verdict retrieval before completion.
- Verdict retrieval after completion.
- Invalid case, evidence, clue, and suspect IDs.
- Rate limiting.

13.3 Frontend tests

Test:

- Scenario form validation.
- Generation loading and failure states.
- Suspect selection.
- Evidence opening and filtering.
- Progress restoration.
- Accusation confirmation.
- Verdict and persisted score display.
- Clue discovery and hint use/remaining counts.
- Mobile navigation.
- Error and empty states.

13.4 End-to-end acceptance tests

A complete test must verify the following journey:

1. Open the application.
2. Enter a valid scenario.
3. Generate a case using a mocked Gemini response.
4. Verify the case is stored.
5. Open the briefing.
6. Inspect all suspects.
7. Open chat evidence.
8. Open image evidence.
9. Open CCTV evidence.
10. Review the timeline.
11. Refresh the page.
12. Verify that investigation progress remains available.
13. Discover clues and verify each unique clue is recorded once.
14. Request hints up to the difficulty limit; verify a retry does not consume an extra hint and an additional request is rejected.
15. Select a culprit and submit the accusation.
16. Verify verdict, persisted score, and score formula against session clue/hint state.
17. Confirm the canonical culprit matches the stored solution.
18. Confirm that the solution was not exposed before the accusation, and that score, clue discovery, hint limits, and accusation results cannot be manipulated or duplicated by the client.

13.5 Quality requirements

- No critical console errors in normal gameplay.
- No broken internal routes.
- No accidental API-key exposure.
- No public solution leakage.
- No unresolved placeholder content in completed production cases.
- No invalid evidence references.
- No inconsistent final outcomes.
- No unhandled promise rejections in expected error scenarios.

---

14. NON-FUNCTIONAL REQUIREMENTS

Performance

- Landing and static pages should load quickly.
- API requests should avoid unnecessary database queries.
- Use pagination where appropriate.
- Lazy-load evidence media.
- Avoid blocking the entire frontend while optional media is loading.
- Set configurable generation and provider timeouts.
- Use asynchronous processing for long-running case generation.
- Poll generation status with a reasonable interval and stop polling when a terminal state is reached.

Do not promise a specific case-generation time until it has been measured against the configured models and deployment.

Reliability

- A valid canonical solution must exist before gameplay begins.
- Case generation must tolerate provider failures.
- A retry must not create duplicate cases unintentionally.
- Accusation results must be stable.
- Failed media must not corrupt the case record.
- Database writes must preserve session and case consistency.

Maintainability

- Use modular services.
- Define reusable validation schemas.
- Centralize API error handling.
- Avoid duplicated business logic.
- Keep public and private data contracts explicit.
- Document important architecture decisions.
- Use clear names and consistent coding conventions.

Browser compatibility

Support current versions of Chrome, Edge, Firefox, and Safari, including mobile browsers.

Scalability

The architecture should allow:

- Multiple simultaneous case generations.
- Multiple anonymous users.
- Separate text and media-generation workloads.
- External object storage.
- Future account support.
- Future asynchronous job queues.

The MVP does not require distributed infrastructure or microservices.

---

15. ENVIRONMENT AND LOCAL DEVELOPMENT

Prerequisites

- A supported Node.js LTS version.
- npm.
- A MongoDB connection.
- A Gemini API key.
- Optional image and video generation credentials.

Development setup

The repository should provide root-level scripts for running the frontend and backend.

Example root "package.json" scripts:

{
  "scripts": {
    "dev": "concurrently -k \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm --prefix server run dev",
    "dev:client": "npm --prefix client run dev",
    "build": "npm --prefix client run build",
    "test": "npm --prefix server test && npm --prefix client test"
  }
}

Add "concurrently" as a development dependency if this script is used.

The frontend should use an environment-configurable API base URL and a Vite proxy during local development if appropriate.

Provide:

- ".env.example"
- Root "README.md"
- Installation instructions.
- Startup instructions.
- API documentation.
- Database setup instructions.
- Gemini configuration instructions.
- Test commands.
- Troubleshooting instructions.

The application must run locally without requiring an image or video provider if the development configuration uses explicitly labeled test assets.

A Gemini API key is required for real AI case generation unless the application is explicitly running in mock mode.

---

16. ACCEPTANCE CRITERIA

The MVP is considered complete only when all mandatory criteria below pass.

Product experience

- [ ] A user can enter a scenario.
- [ ] The user can select difficulty and case category.
- [ ] Easy, Medium, and Hard enforce exactly 3/4/5 suspects and 5/7/9 clues, respectively.
- [ ] Hint limits are 2/3/3 by difficulty and hints do not reveal the culprit.
- [ ] The backend creates a playable mystery.
- [ ] The mystery contains exactly the suspect count defined by difficulty: Easy 3, Medium 4, Hard 5.
- [ ] The mystery contains exactly the clue count defined by difficulty: Easy 5, Medium 7, Hard 9.
- [ ] Each suspect has a distinct profile and alibi.
- [ ] The case contains fictional chat evidence.
- [ ] The case contains image-based evidence or clearly labeled development media.
- [ ] The case contains CCTV-style evidence.
- [ ] The case includes a chronological timeline.
- [ ] The user can inspect and filter evidence.
- [ ] The user can select one culprit.
- [ ] The user can discover clues and receive clue points only once per unique clue.
- [ ] The user can request hints within the difficulty limit; repeated requests cannot bypass the limit.
- [ ] The backend calculates and persists the final score using the specified formula and zero floor.
- [ ] The result page displays the persisted final score.
- [ ] The application displays the final verdict and reasoning.
- [ ] The user can reopen a saved case.

AI quality

- [ ] Gemini runs on the backend.
- [ ] Structured output is validated.
- [ ] The culprit is predetermined and immutable.
- [ ] At least two independent clues support the solution.
- [ ] The solution references existing evidence.
- [ ] The generated case passes consistency validation.
- [ ] AI failures produce recoverable errors.
- [ ] The frontend never receives the hidden solution before accusation.

Engineering

- [ ] React + Vite frontend with Tailwind CSS and Express backend run locally.
- [ ] Gemini integration uses the official `@google/genai` SDK and request/data validation uses Zod.
- [ ] MongoDB persists cases and sessions.
- [ ] API endpoints follow the documented contracts.
- [ ] Secrets are stored in environment variables.
- [ ] API validation and error middleware are implemented.
- [ ] Critical backend and frontend tests pass.
- [ ] Direct route navigation works.
- [ ] Mobile layouts work.
- [ ] No critical runtime errors remain.
- [ ] README and setup instructions are complete.

Media integrity

- [ ] Image evidence references valid assets or explicit development placeholders.
- [ ] CCTV records distinguish playable video from frames or storyboards.
- [ ] Production cases do not claim nonexistent media exists.
- [ ] Generated content is clearly identified as fictional.

---

17. IMPLEMENTATION ROADMAP FOR CODEX

Implement the project in the following phases. Do not attempt to build every feature in one enormous code-generation step.

Phase 1 — Foundation

- Initialize the repository.
- Configure React + Vite.
- Configure Express.
- Configure MongoDB and Mongoose.
- Add environment validation.
- Add health-check endpoint.
- Add shared API response conventions.
- Configure Tailwind CSS and build the base layout and design system.
- Create the landing page and scenario form.

Exit condition: The frontend and backend run locally and the health check succeeds.

Phase 2 — Core data model and mock cases

- Create case, solution, session, and media models, including clue catalog, discovered-clue state, hint requests, and persisted score breakdown.
- Define Zod schemas for cases, exact difficulty counts, clues, sessions, hints, and results.
- Implement public and private case serializers.
- Create deterministic mock mystery fixtures.
- Implement case retrieval, suspect retrieval, evidence retrieval, clue discovery, and session persistence for discovered clues/hints.
- Build the case briefing and investigation workspace.

Exit condition: A mock case can be opened, investigated, refreshed, and retrieved from MongoDB.

Phase 3 — Gemini integration

- Integrate the official `@google/genai` SDK.
- Implement structured case generation.
- Create the canonical solution before evidence generation.
- Validate all generated references.
- Implement bounded retries.
- Add generation status tracking.
- Add error handling and rate limiting.

Exit condition: A valid mystery can be generated from a scenario and saved as a playable case.

Phase 4 — Evidence interfaces

- Build the suspect board.
- Build the chat evidence viewer.
- Build the image evidence viewer.
- Build the CCTV viewer.
- Build the timeline.
- Add evidence filtering.
- Add progress tracking, clue discovery, hint UI/limits, and score summaries.

Exit condition: The user can inspect every required evidence type without losing progress.

Phase 5 — Media pipeline

- Implement the media provider abstraction.
- Configure image generation if credentials and a compatible model are available.
- Configure video generation if credentials and a compatible model are available.
- Store generated assets appropriately.
- Add media status and retry handling.
- Provide explicitly labeled development fixtures when real media generation is not configured.

Exit condition: Every evidence item accurately represents its actual media status.

Phase 6 — Accusation and verdict

- Implement anonymous investigation sessions.
- Add session ownership validation.
- Implement culprit selection and backend-only score calculation/persistence.
- Implement final accusation submission.
- Return the canonical solution only after authorized submission.
- Build the verdict screen.
- Prevent duplicate or inconsistent submissions and verify score inputs, score persistence, hint boundaries, and unique clue awards.

Exit condition: The full mystery-solving flow works from scenario to verdict.

Phase 7 — Hardening

- Complete automated tests.
- Test invalid AI responses.
- Test session isolation.
- Test solution confidentiality.
- Test media failures.
- Test responsive layouts.
- Review security and error handling.
- Complete README and API documentation.

Exit condition: All mandatory acceptance criteria pass.

Phase 8 — Deployment preparation

- Configure production environment variables.
- Prepare frontend and backend builds.
- Configure production MongoDB.
- Configure CORS and API URLs.
- Configure media storage if needed.
- Verify logs and health checks.
- Test a complete production-like investigation.

Exit condition: The deployed application can generate, save, investigate, and solve a mystery without exposing secrets or the hidden solution.

---

18. CODEX EXECUTION RULES

These instructions are mandatory for any coding agent implementing this specification.

1. Read "SPEC.md" before making code changes.
2. Treat "SPEC.md" as the authoritative product and technical contract.
3. Inspect the existing repository before creating or modifying files.
4. Preserve working functionality unless a change is required by the specification.
5. Do not replace working features with mock implementations merely to make the application appear complete.
6. Mock providers are permitted for automated tests and explicitly configured development mode.
7. Do not hardcode the culprit in the frontend.
8. Do not expose the canonical solution in public case responses.
9. Do not expose API keys in client code.
10. Do not claim that an image or video exists unless the asset is available.
11. Do not silently omit required features.
12. Do not introduce unnecessary dependencies or architectural complexity.
13. Validate AI output before persisting a playable case.
14. Follow the documented REST API contracts.
15. Write or update tests for every critical feature.
16. Run relevant tests after each implementation phase.
17. Fix regressions before moving to the next phase.
18. Keep "README.md" aligned with the actual implementation.
19. If implementation details conflict with this specification, follow this specification unless an explicit, documented decision changes it.
20. If a genuine ambiguity blocks implementation, record it in an "OPEN_QUESTIONS.md" file and choose the safest minimal implementation where possible.
21. Never mark a feature complete solely because its UI exists; verify the underlying behavior.
22. Report completed features, tests run, known limitations, and remaining work at the end of each phase.

Required completion report

At the end of implementation, Codex must report:

- Features completed.
- Architecture and folder structure created.
- API endpoints implemented.
- Database models created.
- Gemini integration status.
- Image generation status.
- Video generation status.
- Tests executed and their results.
- Local startup instructions.
- Required environment variables.
- Remaining limitations.
- Any acceptance criteria that are not yet satisfied.

---

19. DEFINITION OF DONE

AI Mystery Room is ready for its first release when a user can enter an original scenario, receive a valid AI-generated fictional mystery, investigate multiple forms of evidence, identify a culprit, and receive a consistent explanation of the case.

The application must preserve the canonical solution, prevent premature answer disclosure, persist investigation state, and clearly distinguish generated media from unavailable or simulated media.

The goal is a complete, working mystery-solving product — not just a landing page, a collection of AI-generated text, or a visual prototype.

---

20. SPECIFICATION CHANGE POLICY

"SPEC.md" is the single source of truth for intended product behavior.

When requirements change:

1. Update "SPEC.md" first.
2. Update related API, architecture, or data-model documentation.
3. Implement the change.
4. Update tests and acceptance criteria.
5. Verify that the implementation and documentation agree.

Do not allow the implementation, README, prompts, and API contracts to drift apart.

If a future requirement conflicts with an existing requirement, document the decision explicitly rather than silently maintaining two conflicting specifications.

End of specification.