import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, KeyRound, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeElectionConfig, isElectionCurrentlyOpen } from '../../lib/election';
import { getResults, type ElectionStats } from '../../lib/ballots';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import type { ElectionConfig } from '../../types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ElectionConfig | null>(null);
  const [stats, setStats] = useState<ElectionStats | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeElectionConfig(setConfig);
    return unsubscribe;
  }, []);

  useEffect(() => {
    getResults().then(({ stats }) => setStats(stats));
  }, []);

  if (!config) return <LoadingSpinner label="Chargement du tableau de bord…" />;

  const open = isElectionCurrentlyOpen(config);

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-slate-500">Bonjour, Administrateur</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{config.title}</h1>
      <p className="mt-0.5 text-xs text-slate-400">{user?.email}</p>

      <div className="mt-4">
        <StatusBadge open={open} size="lg" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Électeurs" value={stats ? stats.totalVoters : '—'} />
        <StatCard icon={KeyRound} label="Votes enregistrés" value={stats ? stats.votesCount : '—'} />
        <StatCard
          icon={TrendingUp}
          label="Participation"
          value={stats ? `${stats.participation.toFixed(1)}%` : '—'}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickLink to="/admin/candidates" title="Gérer les candidats" description="Ajouter, modifier ou supprimer des candidats" />
        <QuickLink to="/admin/codes" title="Codes de vote" description="Générer et exporter les 88 codes" />
        <QuickLink to="/admin/election" title="État de l'élection" description="Ouvrir ou fermer le vote" />
        <QuickLink to="/admin/results" title="Résultats" description="Consulter les résultats en direct" />
      </div>
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

function QuickLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
    </Link>
  );
}
