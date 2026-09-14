import { supabase } from './supabase';
import type { VoterCode } from '../types';

interface VoterCodeRow {
  id: string;
  code: string;
  status: 'UNUSED' | 'USED';
  used_at: string | null;
  created_at: string;
}

function fromRow(row: VoterCodeRow): VoterCode {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

/**
 * Calls the `admin_generate_voter_codes` Postgres function (SECURITY DEFINER,
 * admin-only — see supabase/schema.sql). It replaces any existing codes and
 * returns the plaintext codes, which are only ever available right after
 * generation — used here to build the CSV export.
 */
export async function generateAndStoreCodes(count: number): Promise<string[]> {
  const { data, error } = await supabase.rpc('admin_generate_voter_codes', { p_count: count });
  if (error) throw error;
  return (data as { code: string }[]).map((row) => row.code);
}

export async function listCodes(): Promise<VoterCode[]> {
  const { data, error } = await supabase.from('voter_codes').select('*').order('code', { ascending: true });
  if (error) throw error;
  return (data as VoterCodeRow[]).map(fromRow);
}

/**
 * Fetches the current codes, then keeps `cb` in sync via Supabase Realtime —
 * a status flips to USED the instant a student votes, with no manual
 * refresh needed. Requires `voter_codes` in the `supabase_realtime`
 * publication (see supabase/schema.sql); Realtime enforces the table's RLS
 * per subscriber, so this only ever delivers anything to a full admin.
 */
export function subscribeCodes(cb: (codes: VoterCode[]) => void) {
  let active = true;
  listCodes().then((codes) => {
    if (active) cb(codes);
  });

  const channel = supabase
    .channel('voter_codes_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'voter_codes' }, () => {
      listCodes().then((codes) => {
        if (active) cb(codes);
      });
    })
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export function buildCodesCSV(codes: VoterCode[]): string {
  const header = 'N°,Code,Statut';
  const rows = codes.map((c, i) => {
    const statut = c.status === 'USED' ? 'Utilisé' : 'Disponible';
    return `${i + 1},${c.code},${statut}`;
  });
  return [header, ...rows].join('\n');
}
