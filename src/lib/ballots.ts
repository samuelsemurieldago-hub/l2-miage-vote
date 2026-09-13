import { supabase } from './supabase';
import { isValidCodeFormat, normalizeCode } from './codes';
import { getElectionConfig } from './election';
import { listCandidates } from './candidates';
import type { ResultRow } from '../types';

export type CodeValidationResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'used' | 'closed' };

/**
 * Validates a raw vote code without consuming it, via the `validate_vote_code`
 * Postgres function (SECURITY DEFINER — see supabase/schema.sql). Hashing and
 * the unused/used check happen entirely server-side; consumption only
 * happens at submission time (see submitVote).
 */
export async function validateCode(rawCode: string): Promise<CodeValidationResult> {
  if (!isValidCodeFormat(rawCode)) return { ok: false, reason: 'invalid' };

  const { data, error } = await supabase.rpc('validate_vote_code', { p_code: normalizeCode(rawCode) });
  if (error) return { ok: false, reason: 'invalid' };

  return data as CodeValidationResult;
}

export type SubmitVoteResult = { ok: true } | { ok: false; reason: 'used' | 'closed' | 'invalid' };

/**
 * Atomically marks the code as used and records an anonymous ballot via the
 * `submit_vote` Postgres function. That function row-locks the code
 * (`SELECT ... FOR UPDATE`) inside its own transaction, guaranteeing a code
 * cannot be consumed twice even under concurrent requests. The code and the
 * ballot are never linked in the same table.
 */
export async function submitVote(rawCode: string, candidateId: string): Promise<SubmitVoteResult> {
  const { data, error } = await supabase.rpc('submit_vote', {
    p_code: normalizeCode(rawCode),
    p_candidate_id: candidateId,
  });
  if (error) return { ok: false, reason: 'invalid' };

  return data as SubmitVoteResult;
}

export interface ElectionStats {
  totalVoters: number;
  votesCount: number;
  remaining: number;
  participation: number;
}

export async function getResults(): Promise<{ rows: ResultRow[]; stats: ElectionStats }> {
  const [{ data: ballots, error }, candidates, config] = await Promise.all([
    supabase.from('ballots').select('candidate_id'),
    listCandidates(),
    getElectionConfig(),
  ]);
  if (error) throw error;

  const counts = new Map<string, number>();
  (ballots as { candidate_id: string }[]).forEach(({ candidate_id }) => {
    counts.set(candidate_id, (counts.get(candidate_id) ?? 0) + 1);
  });

  const votesCount = ballots?.length ?? 0;
  const totalVoters = config.totalVoters;

  const rows: ResultRow[] = candidates
    .map((candidate) => {
      const votes = counts.get(candidate.id) ?? 0;
      return {
        candidate,
        votes,
        percentage: votesCount > 0 ? (votes / votesCount) * 100 : 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  const stats: ElectionStats = {
    totalVoters,
    votesCount,
    remaining: Math.max(totalVoters - votesCount, 0),
    participation: totalVoters > 0 ? (votesCount / totalVoters) * 100 : 0,
  };

  return { rows, stats };
}
