import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { CandidateCard } from '../../components/CandidateCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { listCandidates } from '../../lib/candidates';
import { submitVote } from '../../lib/ballots';
import { useVoteSession } from '../../context/VoteSessionContext';
import type { Candidate } from '../../types';

const ERROR_MESSAGES: Record<string, string> = {
  used: 'Ce code a déjà été utilisé.',
  closed: 'Le vote est actuellement fermé.',
  invalid: 'Une erreur est survenue avec votre code de vote.',
};

export default function VoteBallot() {
  const navigate = useNavigate();
  const { code, setCode, setVoteCompleted } = useVoteSession();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCandidates().then((list) => setCandidates(list.filter((c) => c.active)));
  }, []);

  if (!code) {
    return <Navigate to="/vote" replace />;
  }

  const selectedCandidate = candidates?.find((c) => c.id === selectedId) ?? null;

  async function handleConfirm() {
    if (!selectedId || !code) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitVote(code, selectedId);
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.reason] ?? ERROR_MESSAGES.invalid);
        setConfirmOpen(false);
        return;
      }
      setVoteCompleted(true);
      setCode(null);
      navigate('/vote/done');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Choisissez votre candidat</h1>
          <p className="mt-2 text-sm text-slate-500">Sélectionnez un candidat puis confirmez votre vote.</p>
        </div>

        {error && (
          <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {candidates === null ? (
          <LoadingSpinner label="Chargement des candidats…" />
        ) : candidates.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-500">Aucun candidat disponible pour le moment.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                interactive
                selected={selectedId === candidate.id}
                onSelect={() => setSelectedId(candidate.id)}
              />
            ))}
          </div>
        )}

        {candidates && candidates.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!selectedId}
              className="w-full max-w-xs rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmer mon vote
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Êtes-vous sûr de votre choix ?"
        description={
          <>
            Vous vous apprêtez à voter pour{' '}
            <strong>
              {selectedCandidate?.firstName} {selectedCandidate?.lastName}
            </strong>
            . Votre vote sera définitif et ne pourra pas être modifié.
          </>
        }
        confirmLabel={submitting ? 'Enregistrement de votre vote…' : 'Confirmer mon vote'}
        cancelLabel="Retour"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
