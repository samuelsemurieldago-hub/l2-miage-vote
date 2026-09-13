import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Plus, Pencil, Trash2, ImagePlus, ArrowUp, ArrowDown, Eye, EyeOff, User, X } from 'lucide-react';
import {
  addCandidate,
  deleteCandidate,
  reorderCandidates,
  setCandidateActive,
  subscribeCandidates,
  updateCandidate,
  type CandidateInput,
} from '../../lib/candidates';
import { getErrorMessage } from '../../lib/errors';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Candidate } from '../../types';

const EMPTY_FORM: CandidateInput = { firstName: '', lastName: '', slogan: '', description: '', program: '' };

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeCandidates(setCandidates);
    return unsubscribe;
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(candidate: Candidate) {
    setEditing(candidate);
    setFormOpen(true);
  }

  async function handleMove(candidate: Candidate, direction: -1 | 1) {
    if (!candidates) return;
    const index = candidates.findIndex((c) => c.id === candidate.id);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= candidates.length) return;
    const reordered = [...candidates];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setError(null);
    try {
      await reorderCandidates(reordered.map((c) => c.id));
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible de réorganiser les candidats.'));
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCandidate(toDelete.id, toDelete.photoUrl);
      setToDelete(null);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Impossible de supprimer ce candidat.'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(candidate: Candidate) {
    setError(null);
    try {
      await setCandidateActive(candidate.id, !candidate.active);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Impossible de changer le statut de ce candidat."));
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des candidats</h1>
          <p className="mt-1 text-sm text-slate-500">Ajoutez, modifiez ou réorganisez les candidats de l'élection.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Plus size={18} />
          Ajouter un candidat
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {candidates === null ? (
        <LoadingSpinner label="Chargement des candidats…" />
      ) : candidates.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <User size={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Aucun candidat pour le moment.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate, index) => (
            <div
              key={candidate.id}
              className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
                candidate.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <div className="relative aspect-square w-full bg-slate-100">
                {candidate.photoUrl ? (
                  <img src={candidate.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <User size={56} strokeWidth={1.25} />
                  </div>
                )}
                {!candidate.active && (
                  <div className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                    Désactivé
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 p-4">
                <h3 className="font-bold text-slate-900">
                  {candidate.firstName} {candidate.lastName}
                </h3>
                {candidate.slogan && <p className="text-sm italic text-primary-700">« {candidate.slogan} »</p>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 p-3">
                <button
                  onClick={() => openEdit(candidate)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  <Pencil size={14} /> Modifier
                </button>
                <button
                  onClick={() => handleToggleActive(candidate)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  {candidate.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  {candidate.active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => setToDelete(candidate)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => handleMove(candidate, -1)}
                    disabled={index === 0}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Monter"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(candidate, 1)}
                    disabled={index === candidates.length - 1}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Descendre"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <CandidateForm
          candidate={editing}
          nextOrder={candidates?.length ?? 0}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce candidat ?"
        description={
          <>
            Vous êtes sur le point de supprimer{' '}
            <strong>
              {toDelete?.firstName} {toDelete?.lastName}
            </strong>
            . Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function CandidateForm({
  candidate,
  nextOrder,
  onClose,
}: {
  candidate: Candidate | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CandidateInput>(
    candidate
      ? {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          slogan: candidate.slogan,
          description: candidate.description,
          program: candidate.program,
        }
      : EMPTY_FORM,
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(candidate?.photoUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Le prénom et le nom sont requis.');
      return;
    }

    setSaving(true);
    try {
      if (candidate) {
        await updateCandidate(candidate.id, form, photoFile);
      } else {
        await addCandidate(form, photoFile, nextOrder);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Une erreur est survenue lors de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl scrollbar-thin">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            {candidate ? 'Modifier le candidat' : 'Ajouter un candidat'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Photo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {preview ? (
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={28} className="text-slate-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <ImagePlus size={16} />
                Ajouter une photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Prénom</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="Ahmed"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nom</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="XXXXX"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Slogan</label>
            <input
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Ensemble pour une meilleure classe"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Présentation</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Texte de présentation…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Programme (facultatif)</label>
            <textarea
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Texte facultatif…"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le candidat'}
          </button>
        </form>
      </div>
    </div>
  );
}
