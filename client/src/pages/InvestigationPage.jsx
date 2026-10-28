import { ArrowLeft, Check, CircleHelp, Fingerprint, LoaderCircle, LockKeyhole, Search, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const credentialKey = (caseId) => `mystery-session:${caseId}`;

async function api(path, { method = 'GET', session, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || 'The investigation request failed.');
  return payload.data;
}

export function InvestigationPage() {
  const { caseId } = useParams();
  const [caseFile, setCaseFile] = useState(null);
  const [session, setSession] = useState(null);
  const [progress, setProgress] = useState(null);
  const [revealedClues, setRevealedClues] = useState({});
  const [hint, setHint] = useState(null);
  const [selectedSuspect, setSelectedSuspect] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hintRequestId = useRef(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { case: publicCase } = await api(`/api/v1/cases/${caseId}`);
        if (!active) return;
        setCaseFile(publicCase);
        const saved = sessionStorage.getItem(credentialKey(caseId));
        let current;
        if (saved) {
          try {
            current = JSON.parse(saved);
            const state = await api(`/api/v1/cases/${caseId}/session?sessionId=${encodeURIComponent(current.sessionId)}`, { session: current });
            if (!active) return;
            setProgress(state.progress);
            if (state.result) setResult(state.result);
          } catch {
            sessionStorage.removeItem(credentialKey(caseId));
            current = null;
          }
        }
        if (!current) {
          const created = await api(`/api/v1/cases/${caseId}/sessions`, { method: 'POST', body: {} });
          current = { sessionId: created.sessionId, sessionToken: created.sessionToken };
          sessionStorage.setItem(credentialKey(caseId), JSON.stringify(current));
          if (!active) return;
          setProgress(created.progress);
        }
        if (active) setSession(current);
      } catch (loadError) {
        if (active) setError(loadError.message);
      }
    }
    load();
    return () => { active = false; };
  }, [caseId]);

  async function discoverClue(clueId) {
    setBusy(true); setError('');
    try {
      const data = await api(`/api/v1/cases/${caseId}/clues/${clueId}/discover`, { method: 'POST', session, body: { sessionId: session.sessionId } });
      setRevealedClues((current) => ({ ...current, [clueId]: data.clue }));
      setProgress(data.progress);
    } catch (actionError) { setError(actionError.message); }
    finally { setBusy(false); }
  }

  async function requestHint() {
    setBusy(true); setError('');
    hintRequestId.current ??= crypto.randomUUID();
    try {
      const data = await api(`/api/v1/cases/${caseId}/hints`, { method: 'POST', session, body: { sessionId: session.sessionId, requestId: hintRequestId.current } });
      setHint(data.hint); setProgress(data.progress); hintRequestId.current = null;
    } catch (actionError) { setError(actionError.message); }
    finally { setBusy(false); }
  }

  async function accuse(event) {
    event.preventDefault();
    if (!selectedSuspect) { setError('Select a suspect before submitting your accusation.'); return; }
    setBusy(true); setError('');
    try {
      const data = await api(`/api/v1/cases/${caseId}/accuse`, { method: 'POST', session, body: { sessionId: session.sessionId, suspectId: selectedSuspect } });
      setResult(data.result); setProgress((current) => ({ ...current, status: 'completed' }));
    } catch (actionError) { setError(actionError.message); }
    finally { setBusy(false); }
  }

  if (error && !caseFile) return <section className="game-page"><div className="game-state game-state--error" role="alert">{error}<p><Link to="/cases">Return to the case archive</Link></p></div></section>;
  if (!caseFile || !session || !progress) return <section className="game-page"><div className="game-state" role="status"><LoaderCircle className="spin" size={18} /> Opening the case file…</div></section>;

  const completed = Boolean(result);
  const evidenceById = new Map(caseFile.evidence.map((item) => [item.id, item]));
  const selectedName = caseFile.suspects.find(({ id }) => id === result?.selectedSuspectId)?.name;
  const culpritName = caseFile.suspects.find(({ id }) => id === result?.culpritId)?.name;

  return <section className="game-page">
    <Link className="back-link" to="/cases"><ArrowLeft size={15} /> Case archive</Link>
    <header className="game-heading"><div className="eyebrow"><span className="eyebrow-line" /> {caseFile.difficulty.toUpperCase()} · {caseFile.source === 'development_fixture' ? 'DEVELOPMENT CASE' : 'CASE FILE'}</div><h1>{caseFile.title}</h1><p>{caseFile.summary}</p></header>
    {error && <div className="game-alert" role="alert"><ShieldAlert size={17} />{error}</div>}

    {completed ? <section aria-labelledby="verdict-title" className={`verdict-card ${result.correct ? 'verdict-card--correct' : ''}`}>
      <div className="eyebrow"><span className="eyebrow-line" /> CASE CLOSED</div><h2 id="verdict-title">{result.correct ? 'Your accusation was correct.' : 'The evidence pointed elsewhere.'}</h2>
      <p className="verdict-card__score">{result.finalScore} <span>POINTS</span></p>
      <div className="score-breakdown"><span>Correct accusation <strong>{result.scoreBreakdown.basePoints}</strong></span><span>Clues found <strong>+{result.scoreBreakdown.cluePoints}</strong></span><span>Hints used <strong>−{result.scoreBreakdown.hintPenalty}</strong></span></div>
      <p>You accused <strong>{selectedName}</strong>. The culprit was <strong>{culpritName}</strong>.</p><p>{result.solutionExplanation}</p>
      <h3>Evidence that resolves the case</h3><ul className="result-evidence">{result.supportingEvidenceIds.map((id) => <li key={id}><strong>{evidenceById.get(id)?.title ?? id}</strong><span>{evidenceById.get(id)?.description ?? 'Supporting case evidence.'}</span></li>)}</ul>
      <Link className="button button--primary" to="/cases">Choose another case <Fingerprint size={16} /></Link>
    </section> : <>
      <div className="game-briefing"><span className="game-label">INCIDENT BRIEFING</span><p>{caseFile.incident.description}</p><div><span>{caseFile.incident.location}</span><span>{new Date(caseFile.incident.occurredAt).toLocaleString()}</span></div></div>
      <div className="game-progress"><span><Search size={15} /> {progress.discoveredClueCount} / {caseFile.clues.length} clues discovered</span><span><CircleHelp size={15} /> {progress.hintsUsed} / {caseFile.hintLimit} hints used</span></div>

      <section className="game-section"><div className="game-section__title"><div><span className="game-label">01 / PERSONS OF INTEREST</span><h2>Suspect board</h2></div></div><div className="suspect-grid">{caseFile.suspects.map((suspect) => <article className="suspect-card" key={suspect.id}><span className="suspect-card__role">{suspect.role}</span><h3>{suspect.name}</h3><p>{suspect.biography}</p><dl><div><dt>Motive</dt><dd>{suspect.publicMotive}</dd></div><div><dt>Alibi</dt><dd>{suspect.alibi}</dd></div></dl></article>)}</div></section>

      <section className="game-section"><div className="game-section__title"><div><span className="game-label">02 / CASE EVIDENCE</span><h2>Discover the clues</h2></div></div><div className="clue-grid">{caseFile.clues.map((clue, index) => {
        const discovered = progress.discoveredClueIds.includes(clue.id);
        const revealed = revealedClues[clue.id];
        return <article className={`clue-card ${discovered ? 'clue-card--found' : ''}`} key={clue.id}><div className="clue-card__top"><span>CLUE {String(index + 1).padStart(2, '0')}</span>{discovered && <Check size={15} />}</div><h3>{discovered ? clue.title : 'Undiscovered detail'}</h3>{discovered ? <><p>{revealed?.description ?? clue.description}</p><div className="clue-evidence">{clue.evidenceIds.map((id) => { const evidence = evidenceById.get(id); return evidence && <div key={id}><span>{evidence.type.toUpperCase()} · {evidence.title}</span><p>{evidence.description}</p>{evidence.content?.representation && <small>{evidence.content.representation}</small>}{evidence.content?.statement && <blockquote>{evidence.content.statement}</blockquote>}{evidence.content?.messages?.map((message) => <blockquote key={message.id}>{message.text}</blockquote>)}{evidence.content?.frames?.map((frame) => <blockquote key={frame.id}>{frame.timestamp} — {frame.description}</blockquote>)}</div>; })}</div></> : <><p>Examine this lead to add it to your investigation.</p><button className="button button--secondary" disabled={busy} onClick={() => discoverClue(clue.id)} type="button"><LockKeyhole size={14} /> Discover clue <span>+5</span></button></>}</article>;
      })}</div></section>

      <section className="game-section hint-panel"><div><span className="game-label">03 / DETECTIVE'S NOTE</span><h2>Need a nudge?</h2><p>Hints narrow your thinking. Each one costs 10 points at the verdict.</p></div><button className="button button--secondary" disabled={busy || progress.hintsRemaining <= 0} onClick={requestHint} type="button"><CircleHelp size={15} /> {progress.hintsRemaining > 0 ? `Request hint · ${progress.hintsRemaining} left` : 'No hints remaining'}</button>{hint && <div aria-live="polite" className="hint-reveal"><span>HINT {hint.order}</span><p>{hint.text}</p></div>}</section>

      <section className="game-section accusation-panel"><div><span className="game-label">04 / FINAL DECISION</span><h2>Who took it?</h2><p>Submit once you are ready. The verdict will reveal the case solution.</p></div><form onSubmit={accuse}><label className="sr-only" htmlFor="suspect-choice">Select your accusation</label><select id="suspect-choice" onChange={(event) => setSelectedSuspect(event.target.value)} value={selectedSuspect}><option value="">Choose a suspect</option>{caseFile.suspects.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select><button className="button button--primary" disabled={busy} type="submit">Submit accusation <ShieldAlert size={15} /></button></form></section>
    </>}
  </section>;
}
