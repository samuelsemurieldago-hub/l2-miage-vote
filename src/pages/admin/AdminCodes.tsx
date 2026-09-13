import { useEffect, useState } from 'react';
import { KeyRound, Download, RefreshCw, CircleCheck, CircleX, AlertTriangle, AlertCircle } from 'lucide-react';
import { buildCodesCSV, generateAndStoreCodes, listCodes } from '../../lib/voterCodes';
import { subscribeElectionConfig } from '../../lib/election';
import { getErrorMessage } from '../../lib/errors';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { VoterCode } from '../../types';

export default function AdminCodes() {
  const [codes, setCodes] = useState<VoterCode[] | null>(null);
  // Number of codes to generate always follows "Nombre d'électeurs" from
  // Paramètres — changing it there changes how many codes get generated here.
  const [totalVoters, setTotalVoters] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setCodes(await listCodes());
  }

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeElectionConfig((config) => setTotalVoters(config.totalVoters));
    return unsubscribe;
  }, []);

  async function handleGenerate() {
    if (!totalVoters) return;
    setGenerating(true);
    setError(null);
    try {
      await generateAndStoreCodes(totalVoters);
      await refresh();
      setSuccessMsg(`${totalVoters} codes générés avec succès.`);
      setConfirmOpen(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Une erreur est survenue lors de la génération des codes.'));
    } finally {
      setGenerating(false);
    }
  }

  function handleExport() {
    if (!codes || codes.length === 0) return;
    const csv = buildCodesCSV(codes);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codes-vote-l2-miage.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const usedCount = codes?.filter((c) => c.status === 'USED').length ?? 0;
  const unusedCount = codes ? codes.length - usedCount : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des codes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Générez et exportez les {totalVoters ?? '…'} codes de vote uniques (un par électeur — réglable dans{' '}
            <strong>Paramètres → Nombre d'électeurs</strong>).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={!codes || codes.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={16} />
            Exporter les codes
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!totalVoters}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Générer les {totalVoters ?? '…'} codes
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CircleCheck size={16} /> {successMsg}
        </div>
      )}

      {codes === null ? (
        <LoadingSpinner label="Chargement des codes…" />
      ) : codes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <KeyRound size={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Aucun code n'a encore été généré.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Codes générés</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{codes.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CircleCheck size={14} />
                <p className="text-xs font-medium uppercase tracking-wide">Disponibles</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{unusedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-1.5 text-red-600">
                <CircleX size={14} />
                <p className="text-xs font-medium uppercase tracking-wide">Utilisés</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{usedCount}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[28rem] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">N°</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {codes.map((c, i) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{c.code}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            c.status === 'USED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {c.status === 'USED' ? 'Utilisé' : 'Disponible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Générer ${totalVoters ?? ''} codes ?`}
        description={
          <div className="flex flex-col gap-2">
            <p>Cette action va générer les {totalVoters} codes de l'élection.</p>
            {codes && codes.length > 0 && (
              <p className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle size={14} />
                Les {codes.length} codes existants seront remplacés et invalidés.
              </p>
            )}
          </div>
        }
        confirmLabel="Confirmer"
        loading={generating}
        onConfirm={handleGenerate}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
