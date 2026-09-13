import { Check, User } from 'lucide-react';
import type { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  selected?: boolean;
  onSelect?: () => void;
  interactive?: boolean;
}

export function CandidateCard({ candidate, selected = false, onSelect, interactive = false }: CandidateCardProps) {
  const CardTag = interactive ? 'button' : 'div';

  return (
    <CardTag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onSelect : undefined}
      className={`group flex w-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all ${
        interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${selected ? 'border-primary-500 ring-2 ring-primary-500' : 'border-slate-200'}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        {candidate.photoUrl ? (
          <img src={candidate.photoUrl} alt={`${candidate.firstName} ${candidate.lastName}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <User size={64} strokeWidth={1.25} />
          </div>
        )}
        {selected && (
          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
            <Check size={18} strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-bold text-slate-900">
          {candidate.firstName} {candidate.lastName}
        </h3>
        {candidate.slogan && (
          <p className="text-sm font-medium italic text-primary-700">« {candidate.slogan} »</p>
        )}
        {candidate.description && (
          <p className="text-sm leading-relaxed text-slate-600">{candidate.description}</p>
        )}
        {candidate.program && (
          <div className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Programme</p>
            <p className="whitespace-pre-line leading-relaxed">{candidate.program}</p>
          </div>
        )}

        {interactive && (
          <div
            className={`mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-semibold transition-colors ${
              selected
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-slate-300 text-slate-500 group-hover:border-primary-400 group-hover:text-primary-600'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                selected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            Voter
          </div>
        )}
      </div>
    </CardTag>
  );
}
