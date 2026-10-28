import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const difficultyOptions = [
  { id: 'easy', name: 'Easy', suspects: 3, clues: 5, hints: 2, detail: 'A clear trail to follow' },
  { id: 'medium', name: 'Medium', suspects: 4, clues: 7, hints: 3, detail: 'Connect the details' },
  { id: 'hard', name: 'Hard', suspects: 5, clues: 9, hints: 3, detail: 'Every detail matters' },
];
const categories = ['Any', 'Theft', 'Disappearance', 'Corporate mystery', 'College mystery', 'Historical mystery', 'Locked-room mystery', 'Cyber mystery'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function CreatePage() {
  const [scenario, setScenario] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [category, setCategory] = useState('Any');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [generatedCase, setGeneratedCase] = useState(null);
  const [generation, setGeneration] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!scenario.trim()) {
      setStatus('error');
      setMessage('Add a few details about the mystery you have in mind.');
      return;
    }

    setStatus('loading');
    setMessage('Sending your case brief…');
    setGeneratedCase(null);
    setGeneration(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenario.trim(), difficulty, category: category === 'Any' ? 'any' : category.toLowerCase().replaceAll(' ', '_') }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'The case could not be generated. Please try again.');
      }
      if (!payload?.success || !payload.data?.case) {
        throw new Error('The case service returned an incomplete response. Please try again.');
      }
      setGeneratedCase(payload.data.case);
      setGeneration(payload.data.generation ?? { method: 'gemini' });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof TypeError ? 'Could not reach the case service. Check that the backend is running, then try again.' : error.message);
    }
  }

  const chosenDifficulty = difficultyOptions.find((option) => option.id === difficulty);

  return (
    <section className="create-page">
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to the room</Link>
      <div className="create-heading">
        <div className="eyebrow"><span className="eyebrow-line" /> OPEN A NEW FILE</div>
        <h1>Set the scene.</h1>
        <p>Start with a premise. We’ll build the people, the evidence, and the questions around it.</p>
      </div>

      <form className="case-form" onSubmit={handleSubmit} noValidate>
        <div className="form-section">
          <div className="form-section__heading"><span className="form-step">01</span><div><h2>Your scenario</h2><p>What happened, and where should the story begin?</p></div></div>
          <label className="sr-only" htmlFor="scenario">Describe your mystery</label>
          <textarea id="scenario" maxLength={3000} onChange={(event) => setScenario(event.target.value)} placeholder="A curator arrives before opening and finds the observatory’s oldest star chart missing. The room was locked overnight, and four people had a reason to be there…" value={scenario} />
          <div className="field-foot"><span>Fictional scenarios work best. Please don’t include real private messages or personal information.</span><span className={scenario.length > 2800 ? 'character-count character-count--near' : 'character-count'}>{scenario.length.toLocaleString()} / 3,000</span></div>
        </div>

        <div className="form-section">
          <div className="form-section__heading"><span className="form-step">02</span><div><h2>Choose your difficulty</h2><p>The case shape adjusts with the challenge.</p></div></div>
          <fieldset className="difficulty-options">
            <legend className="sr-only">Difficulty</legend>
            {difficultyOptions.map((option) => <label className={`difficulty-card ${difficulty === option.id ? 'difficulty-card--selected' : ''}`} key={option.id}>
              <input checked={difficulty === option.id} name="difficulty" onChange={() => setDifficulty(option.id)} type="radio" value={option.id} />
              <span className="difficulty-card__top"><strong>{option.name}</strong>{difficulty === option.id && <Check size={15} />}</span>
              <span className="difficulty-card__detail">{option.detail}</span>
              <span className="difficulty-card__counts">{option.suspects} suspects <i>·</i> {option.clues} clues</span>
            </label>)}
          </fieldset>
          <p className="hint-note"><LockKeyhole size={13} /> {chosenDifficulty.hints} hints available during the investigation</p>
        </div>

        <div className="form-section form-section--last">
          <div className="form-section__heading"><span className="form-step">03</span><div><h2>Case category</h2><p>A light touch is enough. Choose a direction or leave it open.</p></div></div>
          <label className="sr-only" htmlFor="category">Case category</label>
          <select id="category" onChange={(event) => setCategory(event.target.value)} value={category}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        {status === 'error' && <div className="form-alert" role="alert"><TriangleAlert size={17} /><div><strong>We couldn’t open this case.</strong><p>{message}</p></div><button className="alert-retry" onClick={handleSubmit} type="button">Try again</button></div>}
        {status === 'loading' && <div aria-live="polite" className="form-progress" role="status"><LoaderCircle className="spin" size={17} /><span>{message}</span></div>}
        {status === 'success' && generatedCase && <div aria-live="polite" className="case-ready" role="status">
          <span>{generation?.method === 'prebuilt_fixture_fallback' ? 'PREBUILT FALLBACK CASE' : 'CASE READY'} · {generatedCase.difficulty.toUpperCase()}</span>
          <h2>{generatedCase.title}</h2>
          <p>{generatedCase.summary}</p>
          <p className="case-ready__counts">{generatedCase.suspects.length} suspects · {generatedCase.clues.length} clues · {generatedCase.hintLimit} hints</p>
          {generation?.method === 'prebuilt_fixture_fallback' ? <>
            <p className="case-ready__note">Gemini could not complete this request. This validated prebuilt case is ready to play.</p>
            <Link className="text-link" to={`/investigation/${encodeURIComponent(generatedCase.id)}`}>Play this fallback case <ArrowRight size={14} /></Link>
          </> : <>
            <p className="case-ready__note">Generated cases are not saved between requests yet. You can play one of the deterministic development cases from the case archive.</p>
            <Link className="text-link" to="/cases">Open the case archive <ArrowRight size={14} /></Link>
          </>}
        </div>}
        {status === 'idle' && <div className="empty-note"><span>YOUR CASE PREVIEW</span><p>Your scenario, difficulty, and clue count will appear here.</p></div>}

        <button className="button button--primary submit-button" disabled={status === 'loading'} type="submit">{status === 'loading' ? 'Opening your file' : status === 'success' ? 'Create another mystery' : 'Create my mystery'}{status === 'loading' ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}</button>
        <p className="form-disclaimer">All cases and evidence are fictional and created for entertainment.</p>
      </form>
    </section>
  );
}
