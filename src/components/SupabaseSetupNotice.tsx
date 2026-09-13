import { AlertTriangle } from 'lucide-react';

export function SupabaseSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <AlertTriangle size={28} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Configuration Supabase requise</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Le fichier <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code> n'est pas configuré. Copiez{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.example</code> vers{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code>, renseignez l'URL et la clé anonyme de
          votre projet Supabase, puis relancez l'application.
        </p>
        <p className="mt-4 text-xs text-slate-400">Consultez le README pour les instructions détaillées.</p>
      </div>
    </div>
  );
}
