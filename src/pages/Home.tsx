import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Trophy, User } from 'lucide-react';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { subscribeElectionConfig, isElectionCurrentlyOpen } from '../lib/election';
import { getElectionPodium, type PodiumEntry } from '../lib/podium';
import type { ElectionConfig } from '../types';

const RANK_STYLE: Record<number, { pedestal: string; gradient: string; ring: string; photo: string; order: string }> = {
  1: {
    pedestal: 'h-24 sm:h-36',
    gradient: 'from-amber-400 to-amber-500',
    ring: 'ring-amber-300',
    photo: 'h-20 w-20 sm:h-28 sm:w-28',
    order: 'order-2',
  },
  2: {
    pedestal: 'h-16 sm:h-24',
    gradient: 'from-slate-300 to-slate-400',
    ring: 'ring-slate-300',
    photo: 'h-16 w-16 sm:h-24 sm:w-24',
    order: 'order-1',
  },
  3: {
    pedestal: 'h-11 sm:h-16',
    gradient: 'from-orange-300 to-orange-400',
    ring: 'ring-orange-300',
    photo: 'h-14 w-14 sm:h-20 sm:w-20',
    order: 'order-3',
  },
};

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
        <div className="animate-winner-card relative mt-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-50 p-6 shadow-sm shadow-amber-200/50 sm:p-10">
          <div
            aria-hidden="true"
            className="animate-winner-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="animate-winner-trophy flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white shadow-md shadow-amber-400/40">
              <Trophy size={22} strokeWidth={2.25} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-700">Élection terminée</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">Podium final</h2>
          </div>

          <div className="relative mt-10 flex flex-wrap items-end justify-center gap-2 sm:gap-6">
            {podium.map((p) => {
              const style = RANK_STYLE[p.rank] ?? RANK_STYLE[3];
              const stepDelay = (3 - p.rank) * 0.15;
              return (
                <div key={p.candidateId} className={`flex w-20 flex-col items-center sm:w-36 ${style.order}`}>
                  <div
                    className={`animate-podium-photo overflow-hidden rounded-full bg-white shadow-md ring-4 ring-offset-2 ring-offset-amber-50 ${style.ring} ${style.photo}`}
                    style={{ animationDelay: `${stepDelay + 0.2}s` }}
                  >
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <User size={28} />
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-center text-sm font-bold leading-tight text-slate-900 sm:text-base">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-amber-600 sm:text-xl">{p.percentage.toFixed(1)}%</p>

                  <div
                    className={`animate-podium-step mt-3 flex w-full items-start justify-center rounded-t-lg bg-gradient-to-b pt-2 text-lg font-extrabold text-white shadow-inner sm:text-xl ${style.gradient} ${style.pedestal}`}
                    style={{ animationDelay: `${stepDelay}s` }}
                  >
                    {p.rank}
                  </div>
                </div>
              );
            })}
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
