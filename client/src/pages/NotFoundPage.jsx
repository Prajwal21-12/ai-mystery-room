import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <section className="not-found"><p className="eyebrow">FILE NOT FOUND</p><h1>This page is off the record.</h1><p>The file you’re looking for doesn’t exist in this room.</p><Link className="button button--primary" to="/"><ArrowLeft size={16} /> Return to the room</Link></section>;
}
