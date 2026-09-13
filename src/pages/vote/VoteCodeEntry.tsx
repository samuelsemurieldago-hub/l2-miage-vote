import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound } from 'lucide-react';
import { LogoPlaceholder } from '../../components/LogoPlaceholder';
import { validateCode } from '../../lib/ballots';
import { useVoteSession } from '../../context/VoteSessionContext';
import { subscribeElectionConfig } from '../../lib/election';
import type { ElectionConfig } from '../../types';

const ERROR_MESSAGES: Record<'invalid' | 'used' | 'closed', string> = {
  invalid: 'Code de vote invalide.',
  used: 'Ce code a déjà été utilisé.',
  closed: 'Le vote est actuellement fermé.',
};

function formatCodeInput(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('L2M') ? cleaned.slice(3) : cleaned;
  const part1 = body.slice(0, 4);
  const part2 = body.slice(4, 6);
  return ['L2M', part1, part2].filter(Boolean).join('-');
}

export default function VoteCodeEntry() {
  const navigate = useNavigate();
  const { setCode: setSessionCode } = useVoteSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ElectionConfig | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeElectionConfig(setConfig);
    return unsubscribe;
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await validateCode(code);
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.reason]);
        return;
      }
      setSessionCode(code);
      navigate('/vote/ballot');
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <LogoPlaceholder logoUrl={config?.logoUrl} size={64} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Voter — L2 MIAGE</h1>
          <p className="mt-2 text-sm text-slate-500">
            {config?.studentMessage ?? 'Entrez votre code de vote pour accéder au bulletin.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700">
              Code de vote
            </label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="code"
                required
                autoFocus
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(formatCodeInput(e.target.value))}
                maxLength={11}
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3.5 text-center font-mono text-lg tracking-wider outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="L2M-XXXX-XX"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 11}
            className="mt-2 rounded-xl bg-primary-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Vérification…' : 'Continuer'}
          </button>
        </form>
      </div>
    </div>
  );
}
