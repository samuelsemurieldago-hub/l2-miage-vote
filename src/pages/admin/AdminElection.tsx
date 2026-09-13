import { useEffect, useState } from 'react';
import { AlertCircle, Play, Square, CalendarClock } from 'lucide-react';
import { isElectionCurrentlyOpen, setElectionStatus, subscribeElectionConfig, updateElectionConfig } from '../../lib/election';
import { getErrorMessage } from '../../lib/errors';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { ElectionConfig } from '../../types';

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminElection() {
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeElectionConfig(setConfig);
    return unsubscribe;
  }, []);

  if (!config) return <LoadingSpinner label="Chargement…" />;

  const open = isElectionCurrentlyOpen(config);

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

  async function handleDateChange(field: 'startDate' | 'endDate', value: string) {
    setError(null);
    try {
      await updateElectionConfig({ [field]: value ? new Date(value).toISOString() : null });
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible de mettre à jour la date.'));
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">État de l'élection</h1>
      <p className="mt-1 text-sm text-slate-500">Ouvrez, fermez et planifiez la période de vote.</p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{config.title}</p>
            <div className="mt-2">
              <StatusBadge open={open} size="lg" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpen}
              disabled={saving || open}
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <CalendarClock size={18} />
          <h2 className="font-semibold">Planification (optionnelle)</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Si une date de fin est définie, le vote se fermera automatiquement au-delà de celle-ci.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Date de début</label>
            <input
              type="datetime-local"
              defaultValue={toDatetimeLocal(config.startDate)}
              onBlur={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Date de fin</label>
            <input
              type="datetime-local"
              defaultValue={toDatetimeLocal(config.endDate)}
              onBlur={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="Fermer le vote ?"
        description="Êtes-vous sûr de vouloir fermer le vote ? Les électeurs ne pourront plus voter, mais les résultats resteront accessibles."
        confirmLabel="Fermer le vote"
        confirmVariant="danger"
        loading={saving}
        onConfirm={handleClose}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
