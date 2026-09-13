import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, CircleCheck, ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { subscribeElectionConfig, updateElectionConfig } from '../../lib/election';
import { getErrorMessage } from '../../lib/errors';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { LogoPlaceholder } from '../../components/LogoPlaceholder';
import type { ElectionConfig } from '../../types';

export default function AdminSettings() {
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [form, setForm] = useState<Pick<ElectionConfig, 'title' | 'description' | 'maxChoices' | 'studentMessage' | 'totalVoters'> | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeElectionConfig((c) => {
      setConfig(c);
      setForm((prev) =>
        prev ?? {
          title: c.title,
          description: c.description,
          maxChoices: c.maxChoices,
          studentMessage: c.studentMessage,
          totalVoters: c.totalVoters,
        },
      );
      setLogoUrl((prev) => prev ?? c.logoUrl);
    });
    return unsubscribe;
  }, []);

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    setError(null);
    try {
      const path = `logo-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('branding').getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      await updateElectionConfig({ logoUrl: data.publicUrl });
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Impossible d'envoyer le logo."));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await updateElectionConfig(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Impossible d'enregistrer les paramètres."));
    } finally {
      setSaving(false);
    }
  }

  if (!config || !form) return <LoadingSpinner label="Chargement des paramètres…" />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">Paramètres de l'élection</h1>
      <p className="mt-1 text-sm text-slate-500">Personnalisez le titre, le logo et les textes affichés aux étudiants.</p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Identité visuelle</h2>
          <div className="mt-4 flex items-center gap-4">
            <LogoPlaceholder logoUrl={logoUrl} size={64} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <ImagePlus size={16} />
              {uploadingLogo ? 'Envoi…' : 'Changer le logo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Vous pouvez aussi placer un fichier <code>logo.jpg</code> dans le dossier <code>public/</code> du projet.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Informations générales</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre de l'élection</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Description (page d'accueil)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Message affiché aux étudiants (page de vote)</label>
              <textarea
                value={form.studentMessage}
                onChange={(e) => setForm({ ...form, studentMessage: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Règles de vote</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre de candidats à choisir</label>
              <input
                type="number"
                min={1}
                value={form.maxChoices}
                onChange={(e) => setForm({ ...form, maxChoices: Number(e.target.value) || 1 })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="mt-1 text-xs text-slate-400">MVP : un seul choix possible (valeur 1 recommandée).</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre d'électeurs</label>
              <input
                type="number"
                min={1}
                value={form.totalVoters}
                onChange={(e) => setForm({ ...form, totalVoters: Number(e.target.value) || 1 })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CircleCheck size={16} /> Paramètres enregistrés
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
