/** Normalizes user input (trim, uppercase) before validation/submission. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

// Alphanumeric charset without ambiguous characters (0/O, 1/I) — codes are
// actually generated server-side (see admin_generate_voter_codes in
// supabase/schema.sql); this pattern is only used for instant client-side
// format feedback before the round trip to Supabase.
const CODE_PATTERN = /^L2M-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{2}$/;

export function isValidCodeFormat(raw: string): boolean {
  return CODE_PATTERN.test(normalizeCode(raw));
}
