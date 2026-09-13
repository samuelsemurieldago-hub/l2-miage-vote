import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { useVoteSession } from '../../context/VoteSessionContext';

export default function VoteDone() {
  const { voteCompleted } = useVoteSession();
  const [confirmedOnMount] = useState(voteCompleted);

  if (!confirmedOnMount) {
    return <Navigate to="/vote" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CircleCheck size={44} strokeWidth={1.75} />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Vote enregistré</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Votre vote a bien été enregistré. Merci d'avoir participé à l'élection de la L2 MIAGE.
        </p>

        <Link
          to="/"
          className="mt-8 inline-block rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
