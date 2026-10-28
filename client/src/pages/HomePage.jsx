import { ArrowDown, ArrowRight, ArrowUpRight, Camera, MessageSquareText, ScanEye, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { n: '01', title: 'Set the scene', body: 'Give us a premise. A missing heirloom, a locked archive, a party with one too many secrets.' },
  { n: '02', title: 'Read between the lines', body: 'Follow the people, messages, and details. Every clue belongs to the same story.' },
  { n: '03', title: 'Name your suspect', body: 'Make your accusation when you are ready. The case will reveal what really happened.' },
];

function EvidencePreview() {
  return (
    <div aria-label="Fictional evidence preview" className="evidence-scene">
      <div className="scene-grid" />
      <div className="scene-topline"><span><span className="status-dot" /> CASE FILE 0084</span><span>RESTRICTED</span></div>
      <div className="scene-title"><span>INCIDENT REPORT</span><strong>The Vanishing<br />at Bellweather</strong></div>
      <div className="scene-photo">
        <div className="photo-glow" />
        <div className="window-shape"><div className="window-cross" /></div>
        <div className="table-shape"><span className="case-object" /></div>
        <span className="photo-stamp">SCENE 01 · 22:14</span>
      </div>
      <div className="scene-meta">
        <div><span>PERSONS OF INTEREST</span><strong>04</strong></div>
        <div><span>CLUES LOGGED</span><strong>07</strong></div>
        <div><span>STATUS</span><strong className="status-open">OPEN</strong></div>
      </div>
      <span className="evidence-pin pin-one"><span>01</span><i /></span>
      <span className="evidence-pin pin-two"><span>02</span><i /></span>
      <div className="floating-note note-chat"><MessageSquareText size={14} /><span>LAST MESSAGE</span><strong>“I left it where it was.”</strong></div>
      <div className="floating-note note-camera"><Camera size={14} /><span>CAM 04 · 22:11</span><strong>Movement detected</strong></div>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT CASE IS WAITING</div>
            <h1>Every mystery<br />has a <em>secret.</em></h1>
            <p className="hero-description">Build a case from a single idea. Follow the evidence, question the story, and decide who you believe.</p>
            <div className="hero-actions">
              <Link className="button button--primary" to="/create">Create a mystery <ArrowUpRight size={17} /></Link>
              <Link className="text-link" to="/cases">Play a mock case <ArrowRight size={15} /></Link>
              <a className="text-link" href="#how-it-works">See how it works <ArrowDown size={15} /></a>
            </div>
            <div className="hero-proof"><Shield size={15} /><span>Entirely fictional. Built for curious minds.</span></div>
          </div>
          <div className="hero-art"><EvidencePreview /><div className="art-caption"><span>FILE NO. 0084</span><span>THE BELLWEATHER CASE</span></div></div>
        </div>
        <div className="hero-bottom"><span>01 / THE INVESTIGATION BEGINS</span><span>SCROLL TO EXPLORE <ArrowDown size={12} /></span></div>
      </section>

      <section className="intro-strip" aria-label="What you will investigate">
        <p>Not just a story. <span>A case to solve.</span></p>
        <div className="intro-types"><span><MessageSquareText size={15} /> PRIVATE CHATS</span><span><Camera size={15} /> SCENE PHOTOS</span><span><ScanEye size={15} /> CAMERA LOGS</span></div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-line" /> THE METHOD</div><h2>Three steps.<br /><em>One truth.</em></h2></div>
          <p>Every detail has a place. Read the room, compare the accounts, and trust the evidence that holds together.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => <article className="step-card" key={step.n}><span className="step-number">{step.n}</span><div className="step-rule" /><h3>{step.title}</h3><p>{step.body}</p><ArrowRight className="step-arrow" size={17} /></article>)}
        </div>
      </section>

      <section className="closing-cta">
        <div className="closing-ornament"><Sparkles size={18} /></div>
        <p className="eyebrow">THE FILE IS OPEN</p>
        <h2>Have a theory?</h2>
        <Link className="button button--primary" to="/create">Start your case <ArrowUpRight size={17} /></Link>
      </section>
    </>
  );
}
