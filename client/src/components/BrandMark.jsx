import { Fingerprint } from 'lucide-react';

export function BrandMark({ className = '' }) {
  return <span className={`brand__mark ${className}`}><Fingerprint size={19} strokeWidth={1.7} /></span>;
}
