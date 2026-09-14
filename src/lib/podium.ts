import { supabase } from './supabase';

export interface PodiumEntry {
  candidateId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  slogan: string;
  percentage: number;
  rank: number;
}

/**
 * Public podium via the get_election_podium() RPC — returns nothing while
 * voting is still open, and only ever the top 3 by rank with a rounded
 * percentage. Never the vote counts or the total.
 */
export async function getElectionPodium(): Promise<PodiumEntry[]> {
  const { data, error } = await supabase.rpc('get_election_podium');
  if (error) throw error;
  return (
    data as {
      candidate_id: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
      slogan: string;
      percentage: number;
      rank: number;
    }[]
  ).map((row) => ({
    candidateId: row.candidate_id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    slogan: row.slogan,
    percentage: row.percentage,
    rank: row.rank,
  }));
}
