import { supabase } from './supabase';

export type AdminRole = 'admin' | 'sous_admin';

/**
 * A signed-in user with no row in `admin_profiles` is a full admin by
 * default (see supabase/schema.sql) — only an explicit 'sous_admin' row
 * downgrades them. RLS restricts this query to the caller's own row.
 */
export async function getMyAdminRole(): Promise<AdminRole> {
  const { data } = await supabase.from('admin_profiles').select('role').maybeSingle();
  return data?.role === 'sous_admin' ? 'sous_admin' : 'admin';
}

export interface CandidatePercentage {
  candidateId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  percentage: number;
}

/**
 * The sous_admin's only window into results: rounded percentages per active
 * candidate, via the get_results_percentages() RPC — never raw vote counts,
 * totals, or participation (see supabase/schema.sql).
 */
export async function getResultsPercentages(): Promise<CandidatePercentage[]> {
  const { data, error } = await supabase.rpc('get_results_percentages');
  if (error) throw error;
  return (
    data as {
      candidate_id: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
      percentage: number;
    }[]
  ).map((row) => ({
    candidateId: row.candidate_id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    percentage: row.percentage,
  }));
}
