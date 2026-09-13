import { supabase } from './supabase';
import type { ElectionConfig } from '../types';

const ELECTION_ROW_ID = 1;

export const DEFAULT_ELECTION_CONFIG: ElectionConfig = {
  title: 'Élection des représentants de classe',
  description: "Bienvenue sur la plateforme officielle de vote de la L2 MIAGE.",
  status: 'closed',
  startDate: null,
  endDate: null,
  maxChoices: 1,
  logoUrl: null,
  studentMessage: 'Entrez votre code de vote pour accéder au bulletin.',
  totalVoters: 88,
};

interface ElectionRow {
  title: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  max_choices: number;
  logo_url: string | null;
  student_message: string;
  total_voters: number;
}

function fromRow(row: Partial<ElectionRow> | null | undefined): ElectionConfig {
  if (!row) return DEFAULT_ELECTION_CONFIG;
  return {
    title: row.title ?? DEFAULT_ELECTION_CONFIG.title,
    description: row.description ?? DEFAULT_ELECTION_CONFIG.description,
    status: row.status === 'open' ? 'open' : 'closed',
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    maxChoices: row.max_choices ?? DEFAULT_ELECTION_CONFIG.maxChoices,
    logoUrl: row.logo_url ?? null,
    studentMessage: row.student_message ?? DEFAULT_ELECTION_CONFIG.studentMessage,
    totalVoters: row.total_voters ?? DEFAULT_ELECTION_CONFIG.totalVoters,
  };
}

export async function getElectionConfig(): Promise<ElectionConfig> {
  const { data } = await supabase.from('election_config').select('*').eq('id', ELECTION_ROW_ID).maybeSingle();
  return fromRow(data);
}

/**
 * Fetches the current config, then keeps `cb` in sync via Supabase Realtime.
 * Requires the `election_config` table to be added to the `supabase_realtime`
 * publication (see supabase/schema.sql).
 */
export function subscribeElectionConfig(cb: (config: ElectionConfig) => void) {
  let active = true;
  getElectionConfig().then((config) => {
    if (active) cb(config);
  });

  const channel = supabase
    .channel('election_config_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'election_config', filter: `id=eq.${ELECTION_ROW_ID}` },
      (payload) => cb(fromRow(payload.new as ElectionRow)),
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function updateElectionConfig(partial: Partial<ElectionConfig>) {
  const updates: Record<string, unknown> = { id: ELECTION_ROW_ID };
  if (partial.title !== undefined) updates.title = partial.title;
  if (partial.description !== undefined) updates.description = partial.description;
  if (partial.status !== undefined) updates.status = partial.status;
  if (partial.startDate !== undefined) updates.start_date = partial.startDate;
  if (partial.endDate !== undefined) updates.end_date = partial.endDate;
  if (partial.maxChoices !== undefined) updates.max_choices = partial.maxChoices;
  if (partial.logoUrl !== undefined) updates.logo_url = partial.logoUrl;
  if (partial.studentMessage !== undefined) updates.student_message = partial.studentMessage;
  if (partial.totalVoters !== undefined) updates.total_voters = partial.totalVoters;

  const { error } = await supabase.from('election_config').upsert(updates, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Opens/closes the vote via the set_election_status() RPC (see
 * supabase/schema.sql). Unlike updateElectionConfig, this is callable by
 * BOTH a full admin and a sous_admin — it only ever touches the `status`
 * column, so a sous_admin still can't edit the rest of the election config.
 */
export async function setElectionStatus(status: 'open' | 'closed') {
  const { error } = await supabase.rpc('set_election_status', { p_status: status });
  if (error) throw error;
}

/** Returns true if the election is currently open, accounting for the configured end date. */
export function isElectionCurrentlyOpen(config: ElectionConfig): boolean {
  if (config.status !== 'open') return false;
  if (config.endDate && new Date(config.endDate).getTime() < Date.now()) return false;
  return true;
}
