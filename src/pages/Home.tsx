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
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 animate-fade-in">
            <div className="flex items-center justify-center gap-2 text-amber-700">
              <Trophy size={20} />
              <p className="text-sm font-bold uppercase tracking-wide">
                {winners.length > 1 ? 'Vainqueurs ex æquo' : 'Vainqueur'}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-6">
              {winners.map((w) => (
                <div key={w.candidateId} className="flex flex-col items-center gap-2">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-amber-300 bg-white">
                    {w.photoUrl ? (
                      <img src={w.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-300">
                        <User size={32} />
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">
                    {w.firstName} {w.lastName}
                  </p>
                  {w.slogan && <p className="max-w-[10rem] text-xs italic text-slate-500">« {w.slogan} »</p>}
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
