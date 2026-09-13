import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-slate-500 ${className}`}>
      <Loader2 className="animate-spin text-primary-600" size={32} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
