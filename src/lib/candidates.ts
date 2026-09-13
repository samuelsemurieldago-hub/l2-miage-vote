import { supabase } from './supabase';
import type { Candidate } from '../types';

const CANDIDATES_BUCKET = 'candidates';

export interface CandidateInput {
  firstName: string;
  lastName: string;
  slogan: string;
  description: string;
  program: string;
}

interface CandidateRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  slogan: string;
  description: string;
  program: string;
  active: boolean;
  order_index: number;
  created_at: string;
}

function fromRow(row: CandidateRow): Candidate {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    slogan: row.slogan ?? '',
    description: row.description ?? '',
    program: row.program ?? '',
    active: row.active,
    order: row.order_index,
    createdAt: row.created_at,
  };
}

export async function listCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase.from('candidates').select('*').order('order_index', { ascending: true });
  if (error) throw error;
  return (data as CandidateRow[]).map(fromRow);
}

export function subscribeCandidates(cb: (candidates: Candidate[]) => void) {
  let active = true;
  listCandidates().then((list) => {
    if (active) cb(list);
  });

  const channel = supabase
    .channel('candidates_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
      listCandidates().then((list) => {
        if (active) cb(list);
      });
    })
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function uploadCandidatePhoto(candidateId: string, file: File): Promise<string> {
  const path = `${candidateId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(CANDIDATES_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(CANDIDATES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function addCandidate(input: CandidateInput, photoFile: File | null, order: number): Promise<string> {
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      slogan: input.slogan,
      description: input.description,
      program: input.program,
      photo_url: null,
      active: true,
      order_index: order,
    })
    .select('id')
    .single();
  if (error) throw error;

  const candidateId = data.id as string;

  if (photoFile) {
    const photoUrl = await uploadCandidatePhoto(candidateId, photoFile);
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ photo_url: photoUrl })
      .eq('id', candidateId);
    if (updateError) throw updateError;
  }

  return candidateId;
}

export async function updateCandidate(id: string, input: Partial<CandidateInput>, photoFile: File | null) {
  const updates: Record<string, unknown> = {};
  if (input.firstName !== undefined) updates.first_name = input.firstName;
  if (input.lastName !== undefined) updates.last_name = input.lastName;
  if (input.slogan !== undefined) updates.slogan = input.slogan;
  if (input.description !== undefined) updates.description = input.description;
  if (input.program !== undefined) updates.program = input.program;

  if (photoFile) {
    updates.photo_url = await uploadCandidatePhoto(id, photoFile);
  }

  const { error } = await supabase.from('candidates').update(updates).eq('id', id);
  if (error) throw error;
}

export async function setCandidateActive(id: string, active: boolean) {
  const { error } = await supabase.from('candidates').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deleteCandidate(id: string, photoUrl: string | null) {
  const { error } = await supabase.from('candidates').delete().eq('id', id);
  if (error) throw error;

  if (photoUrl) {
    // photoUrl is a public URL like .../object/public/candidates/<path> — extract the storage path.
    const marker = `/${CANDIDATES_BUCKET}/`;
    const index = photoUrl.indexOf(marker);
    if (index !== -1) {
      const path = photoUrl.slice(index + marker.length);
      await supabase.storage.from(CANDIDATES_BUCKET).remove([path]).catch(() => {});
    }
  }
}

export async function reorderCandidates(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) => supabase.from('candidates').update({ order_index: index }).eq('id', id)),
  );
}
