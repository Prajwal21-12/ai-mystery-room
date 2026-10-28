import { ArrowUpRight, Fingerprint } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';

export function SiteLayout() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="site-header">
        <div className="site-header__inner">
          <Link aria-label="AI Mystery Room home" className="brand" to="/">
            <span className="brand__mark"><Fingerprint size={19} strokeWidth={1.7} /></span>
            <span className="brand__wordmark">MYSTERY<span>ROOM</span></span>
          </Link>
          <nav aria-label="Main navigation" className="site-nav">
            <NavLink end to="/">Home</NavLink>
            <NavLink to="/cases">Case archive</NavLink>
            <a href="/#how-it-works">How it works</a>
            <Link className="nav-cta" to="/create">Create a case <ArrowUpRight size={15} /></Link>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>AI MYSTERY ROOM <span className="footer-dot">·</span> FICTIONAL INVESTIGATIONS</span>
          <span>Every detail is invented for entertainment.</span>
        </div>
      </footer>
    </div>
  );
}
