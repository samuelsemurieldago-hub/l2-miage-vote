import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Users, Vote, TrendingUp, Trophy } from 'lucide-react';
import { getResults, type ElectionStats } from '../../lib/ballots';
import { getErrorMessage } from '../../lib/errors';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { ResultRow } from '../../types';

const BAR_COLORS = ['bg-primary-600', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];

export default function AdminResults() {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await getResults();
    setRows(data.rows);
    setStats(data.stats);
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible de charger les résultats.'));
    });
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await load();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible d’actualiser les résultats.'));
    } finally {
      setRefreshing(false);
    }
  }

  const maxVotes = rows && rows.length > 0 ? Math.max(...rows.map((r) => r.votes), 1) : 1;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Résultats de l'élection</h1>
          <p className="mt-1 text-sm text-slate-500">Calculés automatiquement à partir des bulletins anonymes.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {!rows || !stats ? (
        error ? null : <LoadingSpinner label="Chargement des résultats…" />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Électeurs" value={stats.totalVoters} />
            <StatCard icon={Vote} label="Votes enregistrés" value={stats.votesCount} />
            <StatCard icon={Vote} label="Votes restants" value={stats.remaining} />
            <StatCard icon={TrendingUp} label="Participation" value={`${stats.participation.toFixed(1)}%`} />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Aucun candidat à afficher.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {rows.map((row, i) => (
                  <div key={row.candidate.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && row.votes > 0 && <Trophy size={16} className="text-amber-500" />}
                        <span className="font-semibold text-slate-900">
                          {row.candidate.firstName} {row.candidate.lastName}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-500">
                        {row.votes} vote{row.votes !== 1 ? 's' : ''} · {row.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${(row.votes / maxVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
