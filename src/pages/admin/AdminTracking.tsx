import { useEffect, useState } from 'react';
import { LogOut, Play, RefreshCw, Square, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getResultsPercentages, type CandidatePercentage } from '../../lib/adminRole';
import { isElectionCurrentlyOpen, setElectionStatus, subscribeElectionConfig } from '../../lib/election';
import { getErrorMessage } from '../../lib/errors';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { ElectionConfig } from '../../types';

const BAR_COLORS = ['bg-primary-600', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'];

export default function AdminTracking() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CandidatePercentage[] | null>(null);
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  async function load() {
    setError(null);
    try {
      setRows(await getResultsPercentages());
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible de charger le suivi.'));
    }
  }

  useEffect(() => {
    load();
    const unsubscribe = subscribeElectionConfig(setConfig);
    return unsubscribe;
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleOpen() {
    setSaving(true);
    setError(null);
    try {
      await setElectionStatus('open');
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Impossible d'ouvrir le vote."));
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    setSaving(true);
    setError(null);
    try {
      await setElectionStatus('closed');
      setConfirmClose(false);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible de fermer le vote.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const open = config ? isElectionCurrentlyOpen(config) : false;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">L2 MIAGE</p>
          <h1 className="text-lg font-bold text-slate-900">Suivi de l'élection</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {config ? <StatusBadge open={open} size="lg" /> : <LoadingSpinner />}
            <div className="flex gap-3">
              <button
                onClick={handleOpen}
                disabled={saving || open || !config}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40"
              >
                <Play size={16} />
                Ouvrir le vote
              </button>
              <button
                onClick={() => setConfirmClose(true)}
                disabled={saving || !open}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-40"
              >
                <Square size={16} />
                Fermer le vote
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">Progression par candidat.</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {rows === null ? (
            error ? null : <LoadingSpinner label="Chargement…" />
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <Users size={32} className="mx-auto mb-2 text-slate-300" />
              Aucun candidat pour le moment.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {rows.map((row, i) => (
                <div key={row.candidateId}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {row.firstName} {row.lastName}
                    </span>
                    <span className="text-sm font-medium text-slate-500">{row.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${row.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmClose}
        title="Fermer le vote ?"
        description="Les électeurs ne pourront plus voter. Cette action est réversible (vous pourrez rouvrir le vote)."
        confirmLabel="Fermer le vote"
        confirmVariant="danger"
        loading={saving}
        onConfirm={handleClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
