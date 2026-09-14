import { supabase } from './supabase';

export interface Winner {
  candidateId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  slogan: string;
}

/**
 * Public winner announcement via the get_election_winners() RPC — returns
 * nothing while voting is still open, and never exposes vote counts, only
 * the identity of the candidate(s) tied for first place once it's over.
 */
export async function getElectionWinners(): Promise<Winner[]> {
  const { data, error } = await supabase.rpc('get_election_winners');
  if (error) throw error;
  return (
    data as {
      candidate_id: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
      slogan: string;
    }[]
  ).map((row) => ({
    candidateId: row.candidate_id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    slogan: row.slogan,
  }));
}
