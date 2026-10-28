import { ArrowLeft, ArrowUpRight, Fingerprint } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function CaseListPage() {
  const [cases, setCases] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Loading development case files…');

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/v1/cases`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || 'Could not load the case files.');
        return payload.data.cases;
      })
      .then((items) => { if (active) { setCases(items); setStatus(items.length ? 'ready' : 'empty'); } })
      .catch((error) => { if (active) { setMessage(error.message); setStatus('error'); } });
    return () => { active = false; };
  }, []);

  return <section className="case-list-page">
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to the room</Link>
    <div className="case-list-heading"><div className="eyebrow"><span className="eyebrow-line" /> DEVELOPMENT CASE ARCHIVE</div><h1>Choose a case.</h1><p>Deterministic fictional investigations are ready to play without Gemini or a database.</p></div>
    {status === 'loading' && <div className="game-state" role="status">{message}</div>}
    {status === 'error' && <div className="game-state game-state--error" role="alert">{message}</div>}
    {status === 'empty' && <div className="game-state">No development cases are available.</div>}
    {status === 'ready' && <div className="case-cards">{cases.map((item) => <article className="case-card" key={item.id}>
      <div className="case-card__mark"><Fingerprint size={18} /></div><span className="case-card__tag">{item.difficulty.toUpperCase()} · FICTIONAL</span>
      <h2>{item.title}</h2><p>{item.summary}</p><div className="case-card__meta"><span>{item.suspectCount} suspects</span><span>{item.clueCount} clues</span><span>{item.hintLimit} hints</span></div>
      <Link className="button button--primary" to={`/investigation/${item.id}`}>Enter investigation <ArrowUpRight size={16} /></Link>
    </article>)}</div>}
  </section>;
}
