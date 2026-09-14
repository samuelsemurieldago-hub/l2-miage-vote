import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Trophy, User } from 'lucide-react';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { subscribeElectionConfig, isElectionCurrentlyOpen } from '../lib/election';
import { getElectionWinners, type Winner } from '../lib/winners';
import type { ElectionConfig } from '../types';

export default function Home() {
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [winners, setWinners] = useState<Winner[] | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeElectionConfig(setConfig);
    return unsubscribe;
  }, []);

  const open = config ? isElectionCurrentlyOpen(config) : false;

  useEffect(() => {
    if (config && !open) {
      getElectionWinners()
        .then(setWinners)
        .catch((err) => {
          console.error(err);
          setWinners([]);
        });
    }
  }, [config, open]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-lg animate-fade-in text-center">
        <div className="flex justify-center">
          <LogoPlaceholder logoUrl={config?.logoUrl} size={88} />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-primary-600">L2 MIAGE</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Élection des représentants de classe
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base text-slate-600">
          {config?.description ?? 'Bienvenue sur la plateforme officielle de vote de la L2 MIAGE.'}
        </p>

        <div className="mt-8 flex justify-center">
          {config === null ? <LoadingSpinner /> : <StatusBadge open={open} size="lg" />}
        </div>

        {winners && winners.length > 0 && (
          <div className="animate-winner-card relative mt-8 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-50 p-6 shadow-sm shadow-amber-200/50 sm:p-8">
            {/* Subtle celebratory sheen sweeping across the card */}
            <div
              aria-hidden="true"
              className="animate-winner-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />

            <div className="relative flex flex-col items-center">
              <div className="animate-winner-trophy flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white shadow-md shadow-amber-400/40">
                <Trophy size={22} strokeWidth={2.25} />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-700">Élection terminée</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                {winners.length > 1 ? 'Vainqueurs ex æquo' : 'Vainqueur'}
              </h2>
            </div>

            <div className="relative mt-6 flex flex-wrap justify-center gap-4">
              {winners.map((w, i) => (
                <div
                  key={w.candidateId}
                  className="flex w-40 flex-col items-center gap-2 rounded-xl bg-white/70 px-4 py-5 shadow-sm ring-1 ring-amber-200/70"
                >
                  <div
                    className="animate-winner-photo h-20 w-20 overflow-hidden rounded-full bg-white shadow-md ring-4 ring-amber-300 ring-offset-2 ring-offset-white/70"
                    style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                  >
                    {w.photoUrl ? (
                      <img src={w.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-300">
                        <User size={32} />
                      </div>
                    )}
                  </div>
                  <p className="text-center font-bold leading-tight text-slate-900">
                    {w.firstName} {w.lastName}
                  </p>
                  {w.slogan && <p className="text-center text-xs italic leading-snug text-slate-500">« {w.slogan} »</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link
            to="/vote"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 sm:w-auto"
          >
            Accéder au vote
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={14} />
          Vote sécurisé et anonyme
        </div>

        <Link
          to="/admin/login"
          className="mt-12 inline-block text-xs font-medium text-slate-400 underline-offset-4 transition hover:text-slate-600 hover:underline"
        >
          Espace administrateur
        </Link>
      </div>
    </div>
  );
}
