import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Trophy, User } from 'lucide-react';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { subscribeElectionConfig, isElectionCurrentlyOpen } from '../lib/election';
import { getElectionPodium, type PodiumEntry } from '../lib/podium';
import type { ElectionConfig } from '../types';

function rankLabel(rank: number): string {
  if (rank === 1) return 'Délégué général';
  if (rank === 2) return 'Sous-délégué';
  return "Tu n'as pas démérité";
}

function rankGradient(rank: number): string {
  if (rank === 1) return 'from-blue-700 via-blue-600 to-blue-500';
  if (rank === 2) return 'from-slate-500 via-slate-400 to-slate-300';
  return 'from-stone-500 via-stone-400 to-stone-300';
}

function rankBadgeGradient(rank: number): string {
  if (rank === 1) return 'from-blue-900 to-blue-700';
  if (rank === 2) return 'from-slate-700 to-slate-500';
  return 'from-stone-700 to-stone-500';
}

export default function Home() {
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [podium, setPodium] = useState<PodiumEntry[] | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeElectionConfig(setConfig);
    return unsubscribe;
  }, []);

  const open = config ? isElectionCurrentlyOpen(config) : false;

  useEffect(() => {
    if (config && !open) {
      getElectionPodium()
        .then(setPodium)
        .catch((err) => {
          console.error(err);
          setPodium([]);
        });
    }
  }, [config, open]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-primary-50 via-white to-slate-50 px-4 py-12">
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
      </div>

      {podium && podium.length > 0 && (
        <div className="w-full max-w-xl">
          <div className="animate-winner-card flex flex-col items-center text-center">
            <div className="animate-winner-trophy flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <Trophy size={20} strokeWidth={2.25} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-blue-700">Élection terminée</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">Résultats</h2>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {podium.map((p, i) => (
              <div
                key={p.candidateId}
                className={`animate-result-row relative flex items-center overflow-hidden rounded-2xl bg-gradient-to-r shadow-md ${rankGradient(p.rank)}`}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div
                  className={`flex w-14 shrink-0 items-center justify-center self-stretch bg-gradient-to-b text-3xl font-black text-white/90 sm:w-20 sm:text-4xl ${rankBadgeGradient(p.rank)}`}
                >
                  {p.rank}
                </div>

                <div className="min-w-0 flex-1 px-4 py-3 sm:px-6 sm:py-4">
                  <p className="truncate text-lg font-extrabold uppercase leading-tight text-white sm:text-xl">
                    {p.lastName}
                  </p>
                  <p className="truncate text-sm font-semibold leading-tight text-white/90 sm:text-base">
                    {p.firstName}
                  </p>
                  <p className="mt-1 text-2xl font-black leading-none text-white sm:text-3xl">
                    {p.percentage.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/80 sm:text-xs">
                    {rankLabel(p.rank)}
                  </p>
                </div>

                <div className="mr-3 h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg sm:mr-5 sm:h-24 sm:w-24">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white text-slate-300">
                      <User size={28} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-lg animate-fade-in text-center">
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
